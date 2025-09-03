import { Component, OnInit } from '@angular/core';
import { AnnotationToolsService } from '../annotation-tools.service';
import { RXCore } from 'src/rxcore';
import { RxCoreService } from 'src/app/services/rxcore.service';
import { ColorHelper } from 'src/app/helpers/color.helper';
import { MARKUP_TYPES } from 'src/rxcore/constants';
import { IMarkup } from '../../../../rxcore/models/IMarkup';
import { firstValueFrom } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NEST_URL, REACT_URL } from '../../../constants';
import { SessionContextService } from '../../../services/session-context.service';
import { NotificationService } from '../../notification/notification.service';

@Component({
  selector: 'rx-properties-panel',
  templateUrl: './properties-panel.component.html',
  styleUrls: ['./properties-panel.component.scss'],
})
export class PropertiesPanelComponent implements OnInit {
  markup: any = -1;
  currentMarkup: IMarkup | null = null;
  currentType: number = 0;
  visible: boolean = false;
  title: string;
  mainTabActiveIndex: number = 0;
  propertyTabActiveIndex: number = 0;
  text: string;
  font: any = { style: {} };
  color: string;
  strokeColor: string;
  snap: boolean = false;
  locked: boolean = false;

  //strokeOpacity: number = 100;
  strokeThickness: number = 1;
  strokeLineStyle: number = 0;
  fillOpacity: number = 100;
  fillColor: string;
  displayName: string;
  infoData = {};
  lengthMeasureType: number = 0;
  arrowType: number = 0;

  isMainTabsVisible: boolean = true;
  isPropertyTextVisible: boolean = false;
  isPropertyTabsVisible: boolean = true;
  isPropertyArrowsVisible: boolean = false;
  isFillOpacityVisible: boolean = true;
  isInfoTabVisible: boolean = true;
  isLoading: boolean = false;
  successMessage: string;
  errorMessage: string;

  placeholder = ['Circle', 'Square', 'Triangle', 'Diamond'];
  isFormCollapsed = true;
  showForm = false;
  showDetails = false;

  formTitle: string = '';
  formDescription: string = '';
  private latestGuiMarkup: { markup: any; operation: any };

  imagePreview: string | null = null;
  base64Image: string | null = null;
  imageError: boolean = false;

  markupNumber: string;

  constructor(
    private readonly rxCoreService: RxCoreService,
    private readonly annotationToolsService: AnnotationToolsService,
    private readonly colorHelper: ColorHelper,
    private http: HttpClient,
    private sessionContext: SessionContextService,
    private readonly notificationService: NotificationService
  ) {}

  _setTitle(): void {
    if (this.markup == -1) {
      this.title = '';
      return;
    }

    if (
      this.markup.type == MARKUP_TYPES.PAINT.HIGHLIGHTER.type &&
      this.markup.subtype == MARKUP_TYPES.PAINT.HIGHLIGHTER.subType
    ) {
      this.title = 'Highlighter';
      return;
    }

    if (
      this.markup.type == MARKUP_TYPES.PAINT.FREEHAND.type &&
      this.markup.subtype == MARKUP_TYPES.PAINT.FREEHAND.subType
    ) {
      this.title = 'Freehand';
      return;
    }

    if (
      this.markup.type == MARKUP_TYPES.ARROW.type &&
      this.markup.subtype != MARKUP_TYPES.CALLOUT.subType
    ) {
      this.title = 'Arrow';
      return;
    }

    switch (this.markup.type) {
      case MARKUP_TYPES.TEXT.type:
        this.title = 'Text';
        break;

      case MARKUP_TYPES.CALLOUT.type:
        this.title = 'Callout';
        break;

      case MARKUP_TYPES.SHAPE.RECTANGLE.type:
        this.title = 'Rectangle';
        break;
      case MARKUP_TYPES.SHAPE.ROUNDED_RECTANGLE.type:
        this.title = 'Rouned Rectangle';
        break;

      case MARKUP_TYPES.SHAPE.ELLIPSE.type:
        this.title = 'Ellipse';
        break;

      case MARKUP_TYPES.SHAPE.CLOUD.type:
        this.title = 'Cloud';
        break;

      case MARKUP_TYPES.SHAPE.POLYGON.type:
        switch (this.markup.subtype) {
          case MARKUP_TYPES.MEASURE.PATH.subType:
            this.title = 'Measure Path';
            break;
          default:
            this.title = 'Polygon';
            break;
        }
        break;

      //this.title = "Polygon";
      //break;

      case MARKUP_TYPES.PAINT.POLYLINE.type:
        this.title = 'Poly line';
        break;

      case MARKUP_TYPES.MEASURE.PATH.type:
        switch (this.markup.subtype) {
          case MARKUP_TYPES.MEASURE.PATH.subType:
            this.title = 'Measure';
            break;
          default:
            this.title = 'Shape';
            break;
        }
        break;

      case MARKUP_TYPES.MEASURE.AREA.type:
        this.title = 'Area';
        break;
      case MARKUP_TYPES.ARROW.type:
        this.title = 'Arrow';
        break;
      case MARKUP_TYPES.MEASURE.LENGTH.type:
        this.title = 'Dimension';
        break;

      case MARKUP_TYPES.COUNT.type:
        this.title = 'Count';
        break;

      case MARKUP_TYPES.STAMP.type:
        this.title = 'Stamp info';
        break;

      default:
        this.title = '';
        break;
    }
  }

  _setVisibility(): void {
    this.mainTabActiveIndex = 0;
    this.isMainTabsVisible = true;
    this.isPropertyTextVisible = false;
    this.isPropertyTabsVisible = true;
    this.isFillOpacityVisible = true;
    this.isPropertyArrowsVisible = false;

    if (this.markup.type == MARKUP_TYPES.ARROW.type) {
      //this.isFillOpacityVisible = false;
      this.isPropertyTextVisible = false;
      this.isPropertyTabsVisible = false;
      this.propertyTabActiveIndex = 1;
      this.isPropertyArrowsVisible = true;
    } else if (
      this.markup.type == MARKUP_TYPES.PAINT.HIGHLIGHTER.type &&
      this.markup.subtype == MARKUP_TYPES.PAINT.HIGHLIGHTER.subType
    ) {
      this.propertyTabActiveIndex = 2;
      this.isPropertyTabsVisible = false;
    } else if (
      this.markup.type == MARKUP_TYPES.PAINT.FREEHAND.type &&
      this.markup.subtype == MARKUP_TYPES.PAINT.FREEHAND.subType
    ) {
      this.propertyTabActiveIndex = 1;
      this.isPropertyTabsVisible = false;
    } else if (
      (this.markup.type == MARKUP_TYPES.PAINT.POLYLINE.type &&
        this.markup.subtype == MARKUP_TYPES.PAINT.POLYLINE.subType) ||
      (this.markup.type == MARKUP_TYPES.MEASURE.PATH.type &&
        this.markup.subtype == MARKUP_TYPES.MEASURE.PATH.subType) ||
      this.markup.type == MARKUP_TYPES.MEASURE.LENGTH.type
    ) {
      this.propertyTabActiveIndex = 1;
      this.isPropertyTabsVisible = false;
    } else if (this.markup.type == MARKUP_TYPES.COUNT.type) {
      this.propertyTabActiveIndex = 2;
      this.isPropertyTabsVisible = this.isFillOpacityVisible = false;
    } else if (this.markup.type == MARKUP_TYPES.STAMP.type) {
      this.mainTabActiveIndex = 1;
      this.isMainTabsVisible = false;
    } else {
      this.isPropertyTabsVisible = true;
      if (
        this.markup.type == MARKUP_TYPES.TEXT.type ||
        this.markup.type == MARKUP_TYPES.CALLOUT.type
      ) {
        this.isPropertyTextVisible = true;
        this.propertyTabActiveIndex = 0;
      } else {
        this.isPropertyTextVisible = false;
        this.propertyTabActiveIndex = 1;
      }
    }
    // this.annotationToolsService.setPropertiesPanelState({ visible: true, readonly: false });

    console.log(this.isFillOpacityVisible);
  }

  toggleForm() {
    this.isFormCollapsed = !this.isFormCollapsed;
  }

  openForm(): void {
    this.showForm = true;
  }

  hideForm() {
    this.showForm = false;
  }

  openShowDetails() {
    this.showDetails = true;
  }

  hideShowDetails() {
    this.showDetails = false;
  }

  operation: any;
  annotation: any;
  issueId: string;

  private isInvalidFileUrl(url?: string | null): boolean {
    if (!url) return true;
    const s = String(url).trim();
    if (!s) return true;
    // Guard common junk
    const badTokens = ['undefined', 'null', 'NaN'];
    if (badTokens.some((t) => s.includes(t))) return true;
    return false;
  }

  get fileUrl(): string | null {
    try {
      const guid = this.markup?.uniqueID;
      if (!guid) return null;

      const attrs = (RXCore as any).getmarkupobjByGUID(guid)?.GetAttributes?.();
      const filePath = attrs?.find((a: any) => a.name === 'filePath')?.value as
        | string
        | undefined;

      if (!filePath) return null;

      const url = `${NEST_URL}/${filePath}`;
      return this.isInvalidFileUrl(url) ? null : url;
    } catch {
      return null;
    }
  }

  // (optional) stricter image check used by the template

  ngOnInit(): void {
    console.log('show form? ', this.showForm);

    //
    this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
      this.operation = operation;
      this.annotation = markup;
      this.snap = RXCore.getSnapState();

      if (operation.deleted) return;

      if (
        markup === -1 ||
        (markup.type == MARKUP_TYPES.CALLOUT.type &&
          markup.subtype == MARKUP_TYPES.CALLOUT.subType) ||
        (markup.type == MARKUP_TYPES.SIGNATURE.type &&
          markup.subtype == MARKUP_TYPES.SIGNATURE.subType) ||
        markup.GetAttribute('Signature')?.value
      )
        return;
      const markupObj = (RXCore as any).getmarkupobjByGUID(markup.uniqueID);
      const attributes = markupObj?.GetAttributes();
      console.log('Markup Created: ? ', attributes && attributes.length > 0);
      if (this.operation?.created && attributes && attributes.length > 0) {
        console.log('Markup created: true');
        RXCore.selectMarkUp(true);
      }

      if (this.annotation.type && attributes && attributes.length > 0) {
        console.log('switch statement');
        this.annotationToolsService.openIssueForm$.subscribe((created) => {
          console.log('created', created);
          if (created) {
            this.showForm = true;
          }
        });
        this.annotationToolsService.setPropertiesPanelState({
          visible: true,
          readonly: false,
        });
      } else {
        console.log(' I am in else condition');
        this.annotationToolsService.openIssueForm$.subscribe((created) => {
          console.log('created', created);
          if (created) {
            this.showForm = true;
            this.annotationToolsService.setPropertiesPanelState({
              visible: true,
              readonly: false,
            });
          }
        });
      }
    });

    this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
      this.latestGuiMarkup = { markup, operation };
    });
    this.currentMarkup = this.rxCoreService.getSelectedMarkup();
    console.log('--->>> >>>> ?', this.markup);
    console.log('Hello ');
    this.rxCoreService.selectedMarkup$.subscribe((markup) => {
      this.currentMarkup = markup;
    });

    this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
      this.markup = markup;
      if (
        markup === -1 ||
        operation.deleted
        //|| markup.type == MARKUP_TYPES.ARROW.type
        //|| markup.type == MARKUP_TYPES.MEASURE.LENGTH.type
        //|| markup.type == MARKUP_TYPES.MEASURE.PATH.type && markup.subtype == MARKUP_TYPES.MEASURE.PATH.subType
      ) {
        this.visible = false;
        return;
      }
      console.log(
        'MARKUP ---> ',
        { markup },
        { attributes: markup.GetAttributes() }
      );

      console.log('markup number', markup.uniqueID);

      this.markupNumber = markup.uniqueID;

      this.currentType = markup.type;
      this.locked = markup.locked;
      //|| markup.type == MARKUP_TYPES.MEASURE.AREA.type && markup.subtype == MARKUP_TYPES.MEASURE.AREA.subType

      this._setVisibility();
      //this._setTitle();
      const filePathAttr = (RXCore as any)
        .getmarkupobjByGUID(markup.uniqueID)
        ?.GetAttributes()
        ?.find((att) => att.name === 'filePath')?.value;
      console.log(
        'HELLO',
        (RXCore as any).getmarkupobjByGUID(markup.uniqueID)?.GetAttributes(),
        'kjdf',
        filePathAttr
      );

      this.title = this.markup.getMarkupType().label;

      this.snap = RXCore.getSnapState();

      this.text = markup.text;
      this.font = {
        style: {
          bold: markup.font.bold,
          italic: markup.font.italic,
        },
        font: markup.font.fontName,
        size: markup.font.height,
      };
      this.color = this.colorHelper.rgbToHex(markup.textcolor);
      this.strokeColor = this.colorHelper.rgbToHex(markup.strokecolor);
      this.strokeThickness = markup.linewidth;
      this.strokeLineStyle = markup.linestyle;
      this.fillColor = this.colorHelper.hexToRgba(
        this.colorHelper.rgbToHex(markup.fillcolor),
        100
      );
      this.fillOpacity = markup.transparency;
      this.displayName = markup
        .GetAttributes()
        ?.find((a) => a.name == 'displayName')?.value;
      this.lengthMeasureType = markup.subtype;
      this.issueId = (RXCore as any)
        .getmarkupobjByGUID(markup.uniqueID)
        ?.GetAttributes()
        ?.find((att) => att.name === 'issueId')?.value;
      console.log(
        'attributes---> ',
        markup.uniqueID,
        (RXCore as any).getmarkupobjByGUID(markup.uniqueID)?.GetAttributes()
      );
      this.formTitle =
        (RXCore as any)
          .getmarkupobjByGUID(markup.uniqueID)
          ?.GetAttributes()
          ?.find((att) => att.name === 'title')?.value || '';
      // this.infoData = {
      //   // RXCore.getDisplayName(markup.signature) ||
      //   'Author:': this.sessionContext.username,
      //   'Time:': (markup as any).GetDateTime(true),

      // };

      this.infoData = {
        ...this.infoData, // keep existing file if new emission lacks it
        'Author:': this.sessionContext.username,
        'Time:': (markup as any).GetDateTime(true),
        title: (RXCore as any)
          .getmarkupobjByGUID(markup.uniqueID)
          ?.GetAttributes()
          ?.find((att) => att.name === 'title')?.value,
        description: (RXCore as any)
          .getmarkupobjByGUID(markup.uniqueID)
          ?.GetAttributes()
          ?.find((att) => att.name === 'description')?.value,
        ...(filePathAttr ? { file: `${NEST_URL}/${filePathAttr}` } : {}),
      };
      // and then, only add/replace file when present:
      if (filePathAttr) {
        (this.infoData as any).file = `${NEST_URL}/${filePathAttr}`;
      }

      if (markup.type == MARKUP_TYPES.COUNT.type) {
        console.log('markup is selected!');
      }

      if (markup.type == MARKUP_TYPES.COUNT.type) {
        this.infoData['Count'] = (markup as any).getcount();
      }
    });

    this.annotationToolsService.propertiesPanelState$.subscribe((state) => {
      this.visible = state?.visible;
      this.markup = state?.markup;

      if (this.markup) {
        this.markup.subtype = this.markup.subType;
        this.currentType = this.markup.type;

        this._setVisibility();
        this.isMainTabsVisible = false;
        this._setTitle();

        this.snap = RXCore.getSnapState();

        this.color = RXCore.getLineColor();
        this.strokeColor = RXCore.getLineColor();

        this.fillColor = this.colorHelper.hexToRgba(
          this.colorHelper.rgbToHex(RXCore.getFillColor()),
          100
        );
        this.fillOpacity = 100;

        this.strokeThickness = RXCore.getLineWidth();
        this.strokeLineStyle = 0;
        this.lengthMeasureType = 0;
        this.lengthMeasureType = this.markup.subtype;
      }
    });
  }
  isValidImageUrl(url: string): boolean {
    if (this.isInvalidFileUrl(url)) return false;
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(url);
  }
  onSave() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const { markup, operation } = this.latestGuiMarkup || {};

    if (!markup || markup === -1) {
      this.errorMessage = 'Markup is not ready.';
      console.warn('âš ï¸ markup is not ready');
      this.isLoading = false;
      return;
    }

    this.markup = markup;
    const markupObj = (RXCore as any).getmarkupobjByGUID(markup.uniqueID);
    markupObj.ClearAttributes();
    markupObj.customattributes = [
      { name: 'title', value: this.formTitle },
      { name: 'description', value: this.formDescription },
    ];

    this.infoData = {
      ...this.infoData,
      title: this.formTitle,
      description: this.formDescription,
    };

    this.createIssue({
      title: this.formTitle,
      description: this.formDescription,
      projectId: this.sessionContext.projectId,
      userId: this.sessionContext.userId,
      image: this.base64Image || null,
    })
      .then((response: any) => {
        // âœ… Add issueId to markup attributes
        markupObj.customattributes.push({
          name: 'issueId',
          value: response.id,
        });
        if (response.file) {
          markupObj.customattributes.push({
            name: 'filePath',
            value: response.file.filePath,
          });
          this.infoData['file'] = `${NEST_URL}/${response.file.filePath}`;
        }

        this.issueId = response.id;
        RXCore.markUpSave();

        this.formTitle = '';
        this.formDescription = '';
        this.visible = false;
        this.annotationToolsService.setOpenIssueForm(false);
        this.showForm = false;
        const payload = {
          type: 'ISSUE_SAVE',
          payload: {
            status: 'success',
            timestamp: new Date().toISOString(),
            signedBy: this.sessionContext.username,
            orderId: this.sessionContext.orderId,
            fileId: response.id,
          },
        };

        // debug—this should print inside the iframe’s console
        console.log(
          '[Angular ▶ parent] about to postMessage:',
          payload,
          'targetOrigin=',
          REACT_URL
        );

        window.parent.postMessage(payload, REACT_URL);
        // âœ… Send postMessage to parent (React)
        //   window.parent.postMessage({
        //     type: 'ISSUE_SAVE',
        //     payload: {
        //       status: 'success',
        //       timestamp: new Date().toISOString(),
        //       signedBy: this.sessionContext.username,
        //       orderId: this.sessionContext.orderId,
        //       fileId: this.sessionContext.projectId, // or actual file ID if you have it
        //     }
        //   }, '*');
    RXCore.exportPDF();

        this.notificationService.notification({
          message: 'Issue Created Successfully!',
          type: 'success',
        });
      })


      .catch((error) => {
        RXCore.markUpSave(); // still save even if issue fails
        this.errorMessage = 'Issue creation failed. Please try again.';
        console.error('Issue creation failed:', error);
      })
      .finally(() => {
        this.isLoading = false;
        this.formTitle = '';
this.formDescription = '';
this.base64Image = null;
this.imagePreview = null;
      });
  }

  // isValidImageUrl(url: string): boolean {
  //   return Boolean(
  //     url && !url.endsWith('/undefined') && !url.includes('undefined')
  //   );
  // }

  // onSave() {
  //   this.isLoading = true;
  //   const { markup, operation } = this.latestGuiMarkup || {};
  //
  //   if (!markup || markup === -1) {
  //     console.log("markup is not ready");
  //     return;
  //   }
  //
  //   this.markup = markup;
  //   const markupObj = (RXCore as any).getmarkupobjByGUID(markup.uniqueID);
  //   markupObj.ClearAttributes();
  //   markupObj.customattributes = [
  //     { name: 'title', value: this.formTitle },
  //     { name: 'description', value: this.formDescription }
  //   ];
  //
  //   this.infoData = {
  //     ...this.infoData,
  //     title: this.formTitle,
  //     description: this.formDescription
  //   };
  //
  //   this.createIssue({title: this.formTitle, description: this.formDescription, projectId: this.sessionContext.projectId, userId: this.sessionContext.userId})
  //     .then(() => {
  //       console.log("issue created")
  //     })
  //     .catch((error) => {
  //       console.log('Saved custom attributes:', markupObj.customattributes);
  //       RXCore.markUpSave();
  //       this.successMessage = 'Issue Saved successfully!';
  //       console.error('âŒ Issue creation failed:', error);
  //     }).finally(() => {
  //     this.isLoading = false;
  //   });
  //
  // }

  // async onSave() {
  //   const { markup, operation } = await firstValueFrom(this.rxCoreService.guiMarkup$);
  //
  //   if (markup === -1) {
  //     console.log("markup is not ready");
  //     return;
  //   }
  //
  //   if (markup.type == MARKUP_TYPES.COUNT.type) {
  //     console.log("markup is selected!");
  //   }
  //
  //   this.markup = markup;
  //   console.log('markup.uniqueID', markup.uniqueID);
  //
  //   const markupObj = (RXCore as any).getmarkupobjByGUID(markup.uniqueID);
  //   markupObj.ClearAttributes();
  //   markupObj.customattributes = [
  //     { name: 'title', value: this.formTitle },
  //     { name: 'description', value: this.formDescription }
  //   ];
  //
  //   this.infoData = {
  //     ...this.infoData,
  //     title: this.formTitle,
  //     description: this.formDescription
  //   };
  //
  //   console.log('Saved custom attributes:', markupObj.customattributes);
  //
  //   RXCore.markUpSave();
  // }

  // onSave() {
  //   this.rxCoreService.guiMarkup$.subscribe(({markup, operation}) => {
  //     if (markup === -1) {
  //       console.log("markup is not ready");
  //       return;
  //     }
  //     if (markup.type == MARKUP_TYPES.COUNT.type) {
  //       console.log("markup is selected!");
  //     }
  //     this.markup = markup;
  //     console.log('markup.uniqueID', markup.uniqueID);
  //     const markupObj = (RXCore as any).getmarkupobjByGUID(markup.uniqueID);
  //     markupObj.ClearAttributes();
  //     markupObj.customattributes = [
  //       {name: 'title', value: this.formTitle},
  //       {name: 'description', value: this.formDescription}
  //     ];
  //     this.infoData = {
  //       ...this.infoData,
  //       title: this.formTitle,
  //       description: this.formDescription
  //     };
  //     console.log('Saved custom attributes:', markupObj.customattributes);
  //   });
  //   RXCore.markUpSave();
  // }

  createIssue(data): Promise<string> {
    // Return issueId
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders();
      this.http
        .post<any>(`${NEST_URL}/api/v1/issue/create`, data, { headers })
        .subscribe({
          next: (response) => {
            console.log('Issue created successfully:', response?.data?.id);
            resolve(response?.data); // âœ… Return the issueId
          },
          error: (error) => {
            console.error('Error creating issue:', error);
            reject(error);
          },
        });
    });
  }

  // onCancel() {
  //   this.formTitle = '';
  //   this.formDescription = '';
  // }

  onTextChange(event): void {
    this.text = event.target.value;
    RXCore.setText(String(this.text));
    RXCore.setFontFull(this.font);
  }

  onTextStyleSelect(font): void {
    this.font = font;
    RXCore.setFontFull(font);
  }

  onColorSelect(color: string): void {
    this.color = color;
    RXCore.changeTextColor(color);
  }

  /*  onStrokeOpacityChange(): void {
     console.log(this.strokeOpacity);
   } */

  onStrokeThicknessChange(): void {
    RXCore.setLineWidth(this.strokeThickness);
  }

  onStrokeLineStyleSelect(lineStyle: number): void {
    this.strokeLineStyle = lineStyle;
    RXCore.setLineStyle(lineStyle);
  }

  onStrokeColorSelect(color: string): void {
    this.strokeColor = color;
    RXCore.changeStrokeColor(color);
  }

  onFillOpacityChange(): void {
    RXCore.changeTransp(this.fillOpacity);
  }

  onFillColorSelect(color: string): void {
    this.fillColor = color;
    RXCore.changeFillColor(color);
    RXCore.markUpFilled();

    let selectedMarkup = RXCore.getSelectedMarkup();

    if (
      (selectedMarkup.type === MARKUP_TYPES.SHAPE.RECTANGLE.type ||
        selectedMarkup.type === MARKUP_TYPES.MEASURE.AREA.type) &&
      (selectedMarkup as any).holes &&
      (selectedMarkup as any).holes.length
    ) {
      this.fillOpacity = 35;
      RXCore.changeTransp(this.fillOpacity);
    }
  }

  onCountTypeChange(type: number): void {
    RXCore.markUpSubType(type);
  }

  onDisplayNameChange(value: string): void {
    this.markup.updateAttribute('displayName', value);
  }

  onLengthMeasureTypeChange(type: number): void {
    this.lengthMeasureType = type;
    RXCore.markUpSubType(type);
  }

  onArrowStyleSelect(type: number): void {
    this.arrowType = type;
    RXCore.markUpSubType(type);
  }

  onSnapChange(onoff: boolean): void {
    RXCore.changeSnapState(onoff);
  }

  onLockChange(onoff: boolean): void {
    //RXCore.changeSnapState(onoff);
    let mrkUp = RXCore.getSelectedMarkup();
    mrkUp.locked = onoff;
  }

  onClose(): void {
    this.visible = false;
    this.annotationToolsService.setOpenIssueForm(false);
    RXCore.selectMarkUp(false);
  }

  onCancel(): void {
    const { markup, operation } = this.latestGuiMarkup || {};

    if (!markup || markup === -1) {
      this.errorMessage = 'Markup is not ready.';
      console.warn('âš ï¸ markup is not ready');
      this.isLoading = false;
      return;
    }

this.formTitle = '';
this.formDescription = '';
this.base64Image = null;
this.imagePreview = null;


    this.markup = markup;
    const markupObj = (RXCore as any).getmarkupobjByGUID(markup.uniqueID);
    const attributes = markupObj?.GetAttributes();

    console.log(
      'Selected Markup:*** ',
      this.markupNumber,
      markup.uniqueID,
      markupObj,
      attributes
    );
    // RXCore.selectMarkupbyGUID
    this.visible = false;
    this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
      console.log('operation?.created', operation?.created);
      if (operation?.created) {
        RXCore.selectMarkUp(true);
      }
    });
    RXCore.deleteMarkupbyGUID(markup.uniqueID);
    RXCore.markUpSave();
    this.annotationToolsService.setOpenIssueForm(false);
    RXCore.selectMarkUp(false);
    this.showForm = false;
  }

onDelete() {
  this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
    if (operation?.created) {
      RXCore.selectMarkUp(true);
    }
  });

  this.deleteIssue()
    .then((response) => {
      if (response) {
        const payload = {
          type: 'ISSUE_SAVE',
          payload: {
            status: 'success',
            timestamp: new Date().toISOString(),
            signedBy: this.sessionContext.username,
            orderId: this.sessionContext.orderId,
            fileId: this.sessionContext.projectId,
          },
        };

        console.log(
          '[Angular ▶ parent] about to postMessage:',
          payload,
          'targetOrigin=',
          REACT_URL
        );

        window.parent.postMessage(payload, REACT_URL);

        this.notificationService.notification({
          message: 'Issue Deleted Successfully!',
          type: 'success',
        });
      }
    })
    .catch((error) => {
      if (error?.status === 401) {
        this.notificationService.notification({
          message: 'You cannot delete this issue because it was created by another user.',
          type: 'error',
        });
      } else {
        this.notificationService.notification({
          message: 'Failed to delete issue. Please try again later.',
          type: 'error',
        });
      }
    });

  this.visible = false;
}

deleteIssue() {
  return new Promise((resolve, reject) => {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http
      .request('delete', `${NEST_URL}/api/v1/issue/${this.issueId}`, {
        headers,
        body: { userId: this.sessionContext.userId },
      })
      .subscribe({
        next: (response) => {
          RXCore.deleteMarkUp();
          RXCore.markUpSave();
          console.log('Issue deleted successfully:', response);
          resolve(true);
        },
        error: (error) => {
          console.error('Error deleting issue:', error);
          reject(error); // will be caught in onDelete
        },
      });
  });
}


  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        console.log('---> Trying to upload the Annotation: ', e.target.result);
        this.imagePreview = e.target.result; // Convert image to base64 for preview
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 800; // Resize width (adjust if needed)
          const maxHeight = 800; // Resize height (adjust if needed)
          let width = img.width;
          let height = img.height;

          // Resize logic
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height *= maxWidth / width;
              width = maxWidth;
            } else {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          // Set canvas size
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Get MIME type based on file extension
          const fileType = file.type || 'image/jpeg'; // Default to JPEG if type is missing

          // Convert to Base64 format (keeping prefix for backend)
          this.base64Image = canvas.toDataURL(fileType, 0.7); // Compress image to 70% quality
          console.log('base64', this.base64Image);
        };
      };
      reader.readAsDataURL(file);
    }
  }
}
