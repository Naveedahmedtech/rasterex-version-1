import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { StampData, StampType } from './StampData';
import { RXCore } from 'src/rxcore';
import { RxCoreService } from 'src/app/services/rxcore.service';
import { ColorHelper } from 'src/app/helpers/color.helper';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StampStorageService } from './stamp-storage.service';
import { UserService } from '../../user/user.service';
import SignaturePad from 'signature_pad';
import { AnnotationToolsService } from '../annotation-tools.service';


@Component({
  selector: 'rx-stamp-panel',
  templateUrl: './stamp-panel.component.html',
  styleUrls: ['./stamp-panel.component.scss'],
})
export class StampPanelComponent implements OnInit {
  private templatesLoaded = false;
  @ViewChild('signatureCanvas', { static: false })
  signatureCanvas!: ElementRef<HTMLCanvasElement>;
  public sigPad?: SignaturePad;
  private sigPadMinWidth = 0.8;
  private sigPadMaxWidth = 2.5;
  // signature area inside Stamps modal

  // if you show/hide sections with *ngIf, call ensureSignaturePad() when the signature section becomes visible
  public ensureSignaturePad(): void {
    if (!this.sigPad && this.signatureCanvas?.nativeElement) {
      this.initSignaturePad();
    } else {
      this.resizeSignatureCanvas();
    }
  }


   @ViewChild('savedList') savedList!: ElementRef;

  form: any = {};
  formConfig: any[];
  @Output() onClose: EventEmitter<void> = new EventEmitter<void>();
  @ViewChild('stampPreview', { static: false })
  stampPreview: ElementRef<HTMLDivElement>;
  opened: boolean = false;
  activeIndex: number = 0;

  remoteImageUrl: string = '';

  stampText: string = 'Draft';
  textColor: string = '#000000';
  selectedFontStyle: string = 'Arial';
  isBold: boolean = false;
  isItalic: boolean = false;
  isUnderline: boolean = false;
  username: boolean = false;
  date: boolean = false;
  time: boolean = false;
  subTextFontSize = 6;
  textOffset = this.subTextFontSize;
  usernameDefaultText: string = 'Demo';
  dateDefaultText: string;
  timeDefaultText: string;
  strokeWidth: number = 1;
  strokeColor: string = '#000000';
  strokeRadius: number = 8;
  activeIndexStamp: number = 1;
  svgContent: string = '';
  templates: StampData[] = [];
  customStamps: StampData[] = [];
  uploadImageStamps: StampData[] = [];
  font: any;
  color: string;
  fillColor = '#ffffff';
  snap: boolean = false;
  isTextAreaVisible: boolean = false;
  fillOpacity: number = 0;
  isFillOpacityVisible: boolean = true;
  isArrowsVisible: boolean = false;
  isThicknessVisible: boolean = false;
  isSnapVisible: boolean = false;
  isBottom: boolean = false;
  style: any;
  text: string = '';
  strokeThickness: number = 1;
  safeSvgContents: SafeHtml[] = [];
  signerName: string = '';
signerEmail: string = '';

  constructor(
    private readonly rxCoreService: RxCoreService,
    private cdr: ChangeDetectorRef,
    private readonly colorHelper: ColorHelper,
    private sanitizer: DomSanitizer,
    private readonly storageService: StampStorageService,
    private readonly userService: UserService,
  public annotationToolService: AnnotationToolsService
  ) {}
  private _setDefaults(): void {
    this.isTextAreaVisible = false;
    this.isFillOpacityVisible = true;
    this.isArrowsVisible = false;
    this.isThicknessVisible = false;
    this.isSnapVisible = false;
    this.text = '';
    this.font = {
      style: {
        bold: false,
        italic: false,
      },
      font: 'Arial',
    };
    this.color = '#000000FF';
    this.strokeThickness = 1;
    this.snap = RXCore.getSnapState();
  }

  private resizeSignatureCanvas = (): void => {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;

    // size based on its parent (your modal layout)
    const parent = canvas.parentElement!;
    const cssWidth = parent.clientWidth || 600;
    const cssHeight = parent.clientHeight || 220;

    // scale for HiDPI
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // keep existing strokes if we resized after drawing
    if (this.sigPad) {
      const data = this.sigPad.toData();
      this.sigPad.clear();
      this.sigPad.fromData(data);
    }
  };

  clearSignature(): void {
    this.sigPad?.clear();
  }

  async saveSignatureAsStandardStamp(): Promise<void> {
    console.log("Clicked saveSignatureAsStandardStamp");
    if (!this.sigPad || this.sigPad.isEmpty()) return;
    console.log("Signature pad is not empty, proceeding to save.");

    const dataUrl = this.sigPad.toDataURL('image/png');
    const { imageData, width, height } = await this.convertUrlToBase64Data(
      dataUrl,
      210,
      { transparent: true }
    );

    const newStamp = {
      name: `signature-${Date.now()}`,
      type: 'image/png',
      width,
      height,
      content: imageData,
    };

    this.storageService
      .addStandardStamp(newStamp)
      .then(async (item: any) => {
        const stampData = await this.convertToStampData({
          id: item.id,
          ...newStamp,
        });
        this.templates = [stampData]; // ⬅️ show only the one just saved
        this.sigPad?.clear();
        this.annotationToolService.setShowSomething(true); 
    // 2. After Angular has updated the DOM with the new template, scroll
    setTimeout(() => {
      if (this.savedList) {
        this.savedList.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 300);
      })
      .catch((err) => console.error('Error saving signature stamp:', err));
  }

  // keep pen color in sync with your color pickers
  onColorSelect(color: string): void {
    this.textColor = color;
    this.color = color;
    if (this.sigPad) this.sigPad.penColor = this.textColor;
  }
  // ---------------------------------------

  private initSignaturePad(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;
    this.resizeSignatureCanvas();
    this.sigPad = new SignaturePad(canvas, {
      minWidth: this.sigPadMinWidth,
      maxWidth: this.sigPadMaxWidth,
      penColor: this.textColor || '#000000',
      backgroundColor: 'rgba(0,0,0,0)',
    });
    window.addEventListener('resize', this.resizeSignatureCanvas, {
      passive: true,
    });
  }

// Adjust pen thickness (1, 2, 3 -> thin/med/thick)
// default to Medium
selectedThickness = 2;

setPenWidth(w: number) {
  this.selectedThickness = w;           // <-- for styling
  this.sigPadMinWidth = Math.max(0.5, w * 0.6);
  this.sigPadMaxWidth = Math.max(1.2, w * 1.8);
  if (this.sigPad) {
    (this.sigPad as any).minWidth = this.sigPadMinWidth;
    (this.sigPad as any).maxWidth  = this.sigPadMaxWidth;
  }
}


// Undo last stroke
undoSignature() {
  if (!this.sigPad) return;
  const data = this.sigPad.toData();
  if (!data.length) return;
  data.pop();
  this.sigPad.fromData(data);
}





 










  get textStyle(): string {
    const textWidth = 120;
    const borderMargin = 5;
    const strokeWidth = this.strokeWidth || 1;
    const availableWidth = textWidth - 2 * borderMargin - strokeWidth;
    let fontSize = 18;
    if (this.stampText.length * 10 > availableWidth) {
      fontSize = availableWidth / (this.stampText.length * 0.6);
    }

    let style = `font-family: ${this.selectedFontStyle}; font-size: ${fontSize}px; fill: ${this.textColor};`;
    if (this.isBold) style += ` font-weight: bold;`;
    if (this.isItalic) style += ` font-style: italic;`;
    if (this.isUnderline) style += ` text-decoration: underline;`;
    return style;
  }

  get subtleTextStyle(): string {
    let style = `font-family: ${this.selectedFontStyle}; font-size: ${this.subTextFontSize}px; fill: ${this.textColor};`;
    if (this.isBold) style += ` font-weight: bold;`;
    if (this.isItalic) style += ` font-style: italic;`;
    return style;
  }
  get timestampText(): string {
    const userName = this.username ? this.usernameDefaultText : '';
    const date = this.date ? this.dateDefaultText : '';
    const time = this.time ? this.timeDefaultText : '';
    return `${userName} ${date} ${time}`.trim();
  }

  get textX(): number {
    const textWidth = 120;
    const borderMargin = 5;
    const strokeWidth = this.strokeWidth || 1;
    return (textWidth + 2 * borderMargin + strokeWidth) / 2;
  }

  get textY(): number {
    const textHeight = 30;
    const borderMargin = 5;
    const strokeWidth = this.strokeWidth || 1;
    var a = (textHeight + 2 * borderMargin + strokeWidth + 20) / 2 - 10;
    return a;
  }

  get svgWidth(): number {
    const textWidth = 120;
    const borderMargin = 5;
    const strokeWidth = this.strokeWidth || 1;
    return textWidth + 2 * borderMargin + strokeWidth;
  }

  get svgHeight(): number {
    const textHeight = 30;
    const borderMargin = 5;
    const strokeWidth = this.strokeWidth || 1;
    return textHeight + 2 * borderMargin + strokeWidth + 20;
  }

  get isAdmin() {
    return this.userService.isAdmin();
  }

  ngOnInit(): void {
    queueMicrotask(() => this.initSignaturePad());

      // Subscribe so the component always stays in sync
  // this.annotationToolService.signerName$.subscribe(name => {
  //   this.signerName = name;
  //   this.cdr.markForCheck(); // if OnPush strategy
  // });

  // this.annotationToolService.signerEmail$.subscribe(email => {
  //   this.signerEmail = email;
  //   this.cdr.markForCheck();
  // });

    this.getCustomStamps();
    this.getUploadImageStamps();
    // this.loadSvg();
    const now = new Date();
    this.dateDefaultText = now.toLocaleDateString();
    this.timeDefaultText = now.toLocaleTimeString();
    this._setDefaults();
    this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
      if (markup === -1 || operation.created || operation.deleted) return;
      this.color = this.colorHelper.rgbToHex(markup.textcolor);
      this.font = {
        style: {
          bold: markup.font.bold,
          italic: markup.font.italic,
        },
        font: markup.font.fontName,
      };
    });
    // this.getStandardStamps();
    this.getCustomStamps();
    this.getUploadImageStamps();
    this.templates = [];
  }
  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeSignatureCanvas);
  }

  loadTemplatesIfNeeded(): void {
    if (this.templatesLoaded) return;
    this.templatesLoaded = true;
    this.getStandardStamps(true); // latest only
  }
  private async convertToStampData(item: any): Promise<StampData> {
    const blobUrl = await this.convertBase64ToBlobUrl(item.content, item.type);
    // const svgContent = atob(item.content);
    // const { width, height } = this.extractSvgDimensions(svgContent);
    const width = item.width ? item.width : 210;
    const height = item.height ? item.height : 75;
    return {
      id: item.id,
      name: item.name,
      src: blobUrl,
      type: item.type,
      height: height,
      width: width,
    };
  }

  // change signature to accept a flag
  getStandardStamps(latestOnly: boolean = false) {
    this.storageService
      .getAllStandardStamps()
      .then((stamps: any[]) => {
        const stampPromises = stamps.map(async (item: any) =>
          this.convertToStampData({ id: item.id, ...JSON.parse(item.data) })
        );

        Promise.all(stampPromises)
          .then((resolvedStamps) => {
            if (!resolvedStamps.length) {
              this.templates = [];
              return;
            }

            if (latestOnly) {
              // pick the newest by id (or change comparator if you have createdAt)
              const newest = resolvedStamps
                .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
                .slice(-1);
              this.templates = newest;
            } else {
              this.templates = resolvedStamps;
            }
          })
          .catch((err) => console.error('Failed to convert stamps:', err));
      })
      .catch((err) => console.error('Error retrieving stamps:', err));
  }

  getCustomStamps() {
    this.storageService
      .getAllCustomStamps()
      .then((stamps: any[]) => {
        const stampPromises = stamps.map(async (item: any) => {
          return this.convertToStampData({
            id: item.id,
            ...JSON.parse(item.data),
          });
        });

        // Resolve all promises to get the stamp data
        Promise.all(stampPromises)
          .then((resolvedStamps) => {
            this.customStamps = resolvedStamps;
            console.log(
              'Custom stamps retrieved successfully:',
              this.customStamps
            );
          })
          .catch((error) => {
            console.error('Failed to convert stamps:', error);
          });
      })
      .catch((error) => {
        console.error('Error retrieving stamps:', error);
      });
  }

  getUploadImageStamps() {
    this.storageService
      .getAllUploadImageStamps()
      .then((stamps: any[]) => {
        const stampPromises = stamps.map(async (item: any) => {
          return this.convertToStampData({
            id: item.id,
            ...JSON.parse(item.data),
          });
        });

        // Resolve all promises to get the stamp data
        Promise.all(stampPromises)
          .then((resolvedStamps) => {
            this.uploadImageStamps = resolvedStamps;
            console.log(
              'Upload image stamps retrieved successfully:',
              this.uploadImageStamps
            );
          })
          .catch((error) => {
            console.error('Failed to convert stamps:', error);
          });
      })
      .catch((error) => {
        console.error('Error retrieving stamps:', error);
      });
  }

  extractSvgDimensions(svgContent: string): { width: number; height: number } {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Extract width and height from the SVG element
    const width = svgElement.getAttribute('width');
    const height = svgElement.getAttribute('height');

    return {
      width: width ? parseFloat(width) : 400, // Default width if not specified
      height: height ? parseFloat(height) : 200, // Default height if not specified
    };
  }

  async fetchSvgContent(blobUrl: string): Promise<string> {
    const response = await fetch(blobUrl);
    const svgText = await response.text();
    return svgText;
  }

  deleteCustomStamp(id: number): void {
    this.storageService
      .deleteCustomStamp(id)
      .then(() => {
        for (let i = 0; i < this.customStamps.length; i++) {
          if (this.customStamps[i].id === id) {
            this.customStamps.splice(i, 1);
            break;
          }
        }
      })
      .catch((error) => {
        console.error('Error deleting stamp:', error);
      });
  }

  deleteStandardStamp(id: number): void {
    this.storageService
      .deleteStandardStamp(id)
      .then(() => {
        this.getStandardStamps(true); // ⬅️ refresh to newest remaining
      })
      .catch((error) => console.error('Error deleting stamp:', error));
  }



  async convertToStandardStamp(type: StampType, id: number) {
    let currentStamp;
    if (type === StampType.CustomStamp) {
      currentStamp = this.customStamps.find((d) => d.id === id);
      this.deleteCustomStamp(id);
    } else if (type === StampType.UploadStamp) {
      currentStamp = this.uploadImageStamps.find((d) => d.id === id);
      this.deleteImageStamp(id);
    }
    const { imageData, width, height } = await this.convertUrlToBase64Data(
      currentStamp.src
    );
    const newStamp = {
      name: currentStamp.name,
      type: StampType.StandardStamp,
      width: width,
      height: height,
      content: imageData,
    };
    this.storageService
      .addStandardStamp(newStamp)
      .then(() => {
        // refresh standard list
        this.getStandardStamps();
      })
      .catch((error) => {
        console.error('Error add standard stamp:', error);
      });
  }

  // Replace your current convertUrlToBase64Data with this version
  private convertUrlToBase64Data(
    url: string,
    newWidth?: number,
    opts: { transparent?: boolean } = {}
  ): Promise<{ imageData: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');

      // Important for external images; harmless for data URLs from signature_pad
      img.crossOrigin = '*';

      img.onload = () => {
        const originalWidth = img.width,
          originalHeight = img.height;
        const aspectRatio = originalWidth / originalHeight;
        const width = newWidth || originalWidth;
        const height = newWidth ? newWidth / aspectRatio : originalHeight;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        if (opts.transparent) {
          // keep alpha channel
          ctx.clearRect(0, 0, width, height);
        } else {
          // previous behavior for regular uploads: flatten to white
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Explicitly use PNG so alpha is preserved when transparent = true
        const base64 = canvas.toDataURL('image/png');
        const base64Index = base64.indexOf('base64,') + 'base64,'.length;
        const imageData = base64.substring(base64Index);
        resolve({ imageData, width, height });
      };

      img.onerror = () => reject(new Error('Error convert to base64'));
      img.src = url;
    });
  }

  async convertBase64ToBlobUrl(
    base64Data: string,
    type: string
  ): Promise<string> {
    const blob = await this.convertBase64ToBlob(base64Data, type);
    return URL.createObjectURL(blob);
  }

  convertBase64ToBlob(base64Data: string, type: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      resolve(new Blob([byteArray], { type }));
    });
  }

  onChangeSubTitle() {
    this.textOffset = this.hasTimestamp() ? 0 : this.subTextFontSize;
  }

  // onColorSelect(color: string): void {
  //   this.textColor = color;
  //   this.color = color;
  // }
  onFillColorSelect(color: string): void {
    this.fillColor = color;
  }
  onTextStyleSelect(font): void {
    this.font = font;
    this.selectedFontStyle = font.font;
    this.font.style.bold ? (this.isBold = true) : (this.isBold = false);
    this.font.style.italic ? (this.isItalic = true) : (this.isItalic = false);
    RXCore.setFontFull(font);
  }
  onStrokeColorSelect(color: string): void {
    this.strokeColor = color;
    this.color = color;
  }
  convertSvgToDataUri(svg: string): string {
    const base64Svg = btoa(svg);
    return `data:image/svg+xml;base64,${base64Svg}`;
  }

  async convertBase64ToSvg(base64Data: string): Promise<string> {
    // Assuming the base64 data is a complete SVG string
    return atob(base64Data);
  }
  hasTimestamp(): boolean {
    const userName = this.username ? this.dateDefaultText : '';
    const date = this.date ? this.dateDefaultText : '';
    const time = this.time ? this.timeDefaultText : '';
    return !!(userName || date || time);
  }

  getSvgData(): string {
    const textWidth = 120;
    const textHeight = 30;
    const borderMargin = 5;
    const cornerRadius = this.strokeRadius || 0;
    const strokeWidth = this.strokeWidth || 1;
    const availableWidth = textWidth - 2 * borderMargin - strokeWidth;
    const availableHeight = textHeight - 2 * borderMargin - strokeWidth;
    let fontSize = 18;
    if (this.stampText.length * 10 > availableWidth) {
      fontSize = availableWidth / (this.stampText.length * 0.6);
    }

    const svgWidth = textWidth + 2 * borderMargin + strokeWidth;
    const svgHeight = textHeight + 2 * borderMargin + strokeWidth + 20;

    const textX = svgWidth / 2;
    const textY = svgHeight / 2;

    const timestampStyle = `font-size: 6px; fill: ${this.textColor};`;

    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
      <rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${
      svgWidth - strokeWidth
    }" height="${svgHeight - strokeWidth}" fill="${this.fillColor}" stroke="${
      this.strokeColor
    }" stroke-width="${strokeWidth}" rx="${cornerRadius}" ry="${cornerRadius}"/>
      <text x="${textX}" y="${
      textY + this.subTextFontSize
    }" text-anchor="middle" alignment-baseline="middle" font-size="${fontSize}" style="font-family: ${
      this.selectedFontStyle
    }; fill: ${this.textColor};">
        <tspan>${this.stampText}</tspan>
        ${
          this.hasTimestamp()
            ? `<tspan x="${textX}" dy="2.2em" style="${timestampStyle}">${this.timestampText}</tspan>`
            : ''
        }
      </text>
    </svg>
  `;
  }

  uploadCustomStamp(): void {
    this.svgContent = this.getSvgData();

    //const svgBase64 = btoa(this.svgContent);
    const svgBase64 = btoa(unescape(encodeURIComponent(this.svgContent)));
    const stampName = 'custom-stamp_' + new Date().getTime();
    const stampType = 'image/svg+xml';

    const newStamp = {
      name: stampName,
      type: stampType,
      content: svgBase64,
    };
    // let stamps = JSON.parse(localStorage.getItem('CustomStamps') || '[]');
    // stamps.push(newStamp);
    // localStorage.setItem('CustomStamps', JSON.stringify(stamps));
    this.storageService
      .addCustomStamp(newStamp)
      .then(async (item: any) => {
        console.log('Custom stamp added successfully:', item);
        const stampData = await this.convertToStampData({
          id: item.id,
          ...newStamp,
        });
        this.customStamps.push(stampData);
        this.opened = false;
      })
      .catch((error) => {
        console.error('Error adding custom stamp:', error);
      });

    // const link = document.createElement('a');
    // link.href = 'data:image/svg+xml;base64,' + svgBase64;
    // link.download = 'custom-stamp.svg';
    // link.click();
  }

  async handleUploadImageUrl() {
    if (!this.remoteImageUrl) return;
    try {
      const { imageData, width, height } = await this.convertUrlToBase64Data(
        this.remoteImageUrl
      );
      const newStamp = {
        name: this.remoteImageUrl,
        type: StampType.StandardStamp,
        content: imageData,
        width,
        height,
      };
      this.storageService
        .addUploadImageStamp(newStamp)
        .then(async (item: any) => {
          console.log('Upload image stamp added successfully:', item);
          const stampData = await this.convertToStampData({
            id: item.id,
            ...newStamp,
          });
          this.uploadImageStamps.push(stampData);
        })
        .catch((error) => {
          console.error('Error adding image stamp:', error);
        });
    } catch (error) {
      console.log(error);
    }
  }

  handleImageUpload(event: any) {
    const files = event.target.files;
    const uploadPromises: Promise<void>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      const uploadPromise = new Promise<void>((resolve, reject) => {
        reader.onload = async (e) => {
          const imageDataWithPrefix = e.target?.result as string;

          // // Dynamically determine the prefix and remove it
          // const base64Index = imageDataWithPrefix.indexOf('base64,') + 'base64,'.length;
          // const imageData = imageDataWithPrefix.substring(base64Index);
          const { imageData, width, height } =
            await this.convertUrlToBase64Data(imageDataWithPrefix, 210);

          const imageName = file.name + '_' + new Date().getTime();
          //const imageType = file.type;
          const imageType = 'image/png';

          const imageObject = {
            content: imageData,
            name: imageName,
            type: imageType,
            width,
            height,
          };

          this.storageService
            .addUploadImageStamp(imageObject)
            .then(async (item: any) => {
              console.log('Upload image stamp added successfully:', item);
              const stampData = await this.convertToStampData({
                id: item.id,
                ...imageObject,
              });
              this.uploadImageStamps.push(stampData);

              resolve(); // Resolve the promise after storing the image
            })
            .catch((error) => {
              reject(error);
            });
        };

        reader.onerror = (error) => {
          reject(error); // Reject the promise if there's an error
        };

        // Read the file as data URL
        reader.readAsDataURL(file);
      });

      uploadPromises.push(uploadPromise); // Push the upload promise to the array
    }

    Promise.all(uploadPromises).then(() => {
      console.log('Image stamps uploaded successfully');
    });
  }

  deleteImageStamp(id: number): void {
    this.storageService
      .deleteUploadImageStamp(id)
      .then(() => {
        for (let i = 0; i < this.uploadImageStamps.length; i++) {
          if (this.uploadImageStamps[i].id === id) {
            this.uploadImageStamps.splice(i, 1);
            break;
          }
        }
      })
      .catch((error) => {
        console.error('Error deleting image stamp:', error);
      });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.form.companyLogo = e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  getTextStyle() {
    return {
      color: this.textColor,
      fontWeight: this.isBold ? 'bold' : 'normal',
      fontStyle: this.isItalic ? 'italic' : 'normal',
      textDecoration: this.isUnderline ? 'underline' : 'none',
      fontFamily: this.selectedFontStyle,
    };
  }

  onPanelClose(): void {
    this.onClose.emit();
  }
}
