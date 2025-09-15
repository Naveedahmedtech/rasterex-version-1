import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {
  AnnotationToolsService,
  DrawnSignature,
} from './annotation-tools.service';
import { RXCore } from 'src/rxcore';
import { RxCoreService } from 'src/app/services/rxcore.service';
import { MARKUP_TYPES } from 'src/rxcore/constants';
import { IGuiConfig } from 'src/rxcore/models/IGuiConfig';
import { UserService } from '../user/user.service';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { SessionContextService } from '../../services/session-context.service';
import { NotificationService } from '../notification/notification.service';
import { GuiMode } from '../../../rxcore/enums/GuiMode';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NEST_URL, REACT_URL } from '../../constants';
import { SignatureModalService } from 'src/app/services/signature-modal.service';

@Component({
  selector: 'rx-annotation-tools',
  templateUrl: './annotation-tools.component.html',
  styleUrls: ['./annotation-tools.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AnnotationToolsComponent implements OnInit {
  @Output() signatureSaved = new EventEmitter<string>();

  guiConfig$ = this.rxCoreService.guiConfig$;
  opened$ = this.service.opened$;
  guiConfig: IGuiConfig | undefined;
  shapesAvailable: number = 5;
  showIssueModal = false;
  annotationCreated: boolean = false;
  mode: string;
  signatureCreated: boolean = false;

  signatureImage: string | null = null;
  signaturePosition = { x: 100, y: 100 }; // default placement

  operation: any;
  annotation: any;
  snap: any;

  ghostX = 0;
  ghostY = 0;

  isActionSelected = {
    TEXT: false,
    CALLOUT: false,
    SHAPE_RECTANGLE: false,
    SHAPE_RECTANGLE_ROUNDED: false,
    SHAPE_ELLIPSE: false,
    SHAPE_CLOUD: false,
    SHAPE_POLYGON: false,
    NOTE: false,
    ERASE: false,
    ARROW_FILLED_BOTH_ENDS: false,
    ARROW_FILLED_SINGLE_END: false,
    ARROW_BOTH_ENDS: false,
    ARROW_SINGLE_END: false,
    PAINT_HIGHLIGHTER: false,
    PAINT_FREEHAND: false,
    PAINT_TEXT_HIGHLIGHTING: false,
    PAINT_POLYLINE: false,
    COUNT: false,
    STAMP: false,
    SCALE_SETTING: false,
    IMAGES_LIBRARY: false,
    SYMBOLS_LIBRARY: false,
    LINKS_LIBRARY: false,
    CALIBRATE: false,
    MEASURE_CONTINUOUS: false,
    MEASURE_LENGTH: false,
    MEASURE_AREA: false,
    MEASURE_PATH: false,
    SNAP: false,
    MARKUP_LOCK: false,
    NO_SCALE: false,
  };

  get isPaintSelected(): boolean {
    return (
      this.isActionSelected['PAINT_HIGHLIGHTER'] ||
      this.isActionSelected['PAINT_FREEHAND'] ||
      this.isActionSelected['PAINT_TEXT_HIGHLIGHTING'] ||
      this.isActionSelected['PAINT_POLYLINE']
    );
  }

  get isShapeSelected(): boolean {
    return (
      this.isActionSelected['SHAPE_RECTANGLE'] ||
      this.isActionSelected['SHAPE_RECTANGLE_ROUNDED'] ||
      this.isActionSelected['SHAPE_ELLIPSE'] ||
      this.isActionSelected['SHAPE_CLOUD'] ||
      this.isActionSelected['SHAPE_POLYGON']
    );
  }

  get isArrowSelected(): boolean {
    return (
      this.isActionSelected['ARROW_FILLED_BOTH_ENDS'] ||
      this.isActionSelected['ARROW_FILLED_SINGLE_END'] ||
      this.isActionSelected['ARROW_BOTH_ENDS'] ||
      this.isActionSelected['ARROW_SINGLE_END']
    );
  }

  get isMeasureSelected(): boolean {
    return (
      this.isActionSelected['MEASURE_LENGTH'] ||
      this.isActionSelected['MEASURE_AREA'] ||
      this.isActionSelected['MEASURE_PATH']
    );
  }

  canAddAnnotation = this.userService.canAddAnnotation$;
  canUpdateAnnotation = this.userService.canUpdateAnnotation$;
  canDeleteAnnotation = this.userService.canDeleteAnnotation$;

  constructor(
    public service: AnnotationToolsService,
    private readonly rxCoreService: RxCoreService,
    private readonly userService: UserService,
    public sessionContext: SessionContextService,
    private readonly notificationService: NotificationService,
    private http: HttpClient,
    public signatureModal: SignatureModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // RXCore.lockMarkup(true)
    console.log(
      'SELLL----kjdsf===ksdjf==++',
      this.rxCoreService.getSelectedMarkup()
    );

    this.guiConfig$.subscribe((config) => {
      this.guiConfig = config;

      this.shapesAvailable =
        Number(!this.guiConfig.disableMarkupShapeRectangleButton) +
        Number(!this.guiConfig.disableMarkupShapeRoundedRectangleButton) +
        Number(!this.guiConfig.disableMarkupShapeEllipseButton) +
        Number(!this.guiConfig.disableMarkupShapeCloudButton) +
        Number(!this.guiConfig.disableMarkupShapePolygonButton);
    });

    this.rxCoreService.guiState$.subscribe((state) => {
      this._deselectAllActions();
      //this.service.setNotePanelState({ visible: false });
      //this.service.hideQuickActionsMenu();
      //this.service.setNotePopoverState({visible: false, markup: -1});
      //this.service.hide();
      //this.service.setMeasurePanelState({ visible: false });
    });

    this.rxCoreService.guiTextInput$.subscribe(({ rectangle, operation }) => {
      if (operation === -1) return;

      if (operation.start) {
        this._deselectAllActions();
      }
    });

    this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
      console.log('-23482359=-0dfgkj');
      if (markup !== -1) {
        if (markup.type == MARKUP_TYPES.COUNT.type) return;
        if (markup.type == MARKUP_TYPES.STAMP.type) {
          if (operation?.created) return;
          this.isActionSelected['STAMP'] = false;
        }
      }
    });

    this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
      if (
        markup &&
        markup !== -1 &&
        typeof (markup as any).getUniqueID === 'function'
      ) {
        if (this.mode === 'signature' && this.isActionSelected['STAMP']) {
          this.signatureCreated = true;
          this.isActionSelected['STAMP'] = false;
        }
        console.log('Operation created!', (markup as any).getUniqueID());
      } else {
        console.warn('Operation failed or markup invalid:', markup);
      }

      if (markup !== -1) {
        if (markup.type == MARKUP_TYPES.COUNT.type) return;
        if (markup.type == MARKUP_TYPES.STAMP.type) {
          if (operation?.created) return;
          // this.isActionSelected['STAMP'] = false;
        }
      }

      if (markup === -1 || operation?.created) {
        const selectedAction = Object.entries(this.isActionSelected).find(
          ([key, value]) => value
        );
        console.log('selectedAction', selectedAction);
        //console.log("reset to default tool here");
        if (operation?.created) {
          this.annotationCreated = true;
          console.log('Markup selected', RXCore.getSelectedMarkup());

          this._deselectAllActions();
          if (this.mode === 'annotation') {
            // RXCore.markUpSave();
            this.confirmAnnotation();
          }
        }
        //this._deselectAllActions();

        if (operation?.created && this.shapesAvailable == 1 && selectedAction) {
          this.onActionSelect(selectedAction[0]);
        }
      }
      this.rxCoreService.setSelectedMarkup(markup);
    });

    this.service.measurePanelState$.subscribe((state) => {
      this.isActionSelected['SCALE_SETTING'] = state.visible;

      /*if(state.visible && this.isActionSelected['SCALE_SETTING'] === false){
        // this.onActionSelect('SCALE_SETTING');
        this.isActionSelected['SCALE_SETTING'] = true;
      }*/
    });

    this.service.imagePanelState$.subscribe((state) => {
      this.isActionSelected['IMAGES_LIBRARY'] = state.visible;
    });
    this.service.symbolPanelState$.subscribe((state) => {
      this.isActionSelected['SYMBOLS_LIBRARY'] = state.visible;
    });
    this.service.linkPanelState$.subscribe((state) => {
      this.isActionSelected['LINKS_LIBRARY'] = state.visible;
    });

    this.service.snapState$.subscribe((state) => {
      if (state) {
        this.isActionSelected['SNAP'] = state;
      }
    });
  }

  private _deselectAllActions(): void {
    Object.entries(this.isActionSelected).forEach(([key, value]) => {
      if (
        key !== 'MARKUP_LOCK' &&
        key !== 'SNAP' &&
        key !== 'NO_SCALE' &&
        key !== 'MEASURE_CONTINUOUS'
      ) {
        this.isActionSelected[key] = false;
      }

      /*case 'MARKUP_LOCK' :
        RXCore.lockMarkup(this.isActionSelected[actionName]);
        break;*/

      /*if (key == 'NOTE') {
        RXCore.markUpNote(false);
      }*/
    });

    this.mode = this.sessionContext.mode!;

    console.log({
      mode: this.sessionContext.mode,
      signed: this.sessionContext.isSigned,
    });
    RXCore.restoreDefault();
    //this.service.hideQuickActionsMenu();
    //this.service.setNotePanelState({ visible: false });
    //this.service.setPropertiesPanelState({ visible: false });
    //this.service.setMeasurePanelState({ visible: false });
    //this.service.setMeasurePanelDetailState({ visible: false });
  }

  showTooltip = false;
  tooltipX = 0;
  tooltipY = 0;
  mouseMoveListener: any;
  mouseUpListener: any;
  showMouseTooltip = false;
  mouseX = 0;
  mouseY = 0;
  pointerMoveListener: any;
  pointerUpListener: any;
  savingSignature: boolean = false;
  signaturedSaved: boolean = false;

  signaturePlaced = false;
  placingMode = false;

  private savingGuard = false;

  onSaveTap(ev?: Event) {
    // prevent the viewer behind from eating the tap
    ev?.preventDefault?.();
    ev?.stopPropagation?.();

    // de-dupe (click + pointerup + touchend can all fire on some devices)
    if (this.savingGuard || this.savingSignature) return;
    this.savingGuard = true;

    // run your existing save flow
    Promise.resolve(this.saveSignature())
      .catch((err) => console.error('saveSignature failed:', err))
      .finally(() => {
        this.savingGuard = false;

        // force Angular to paint the overlay updates
        try {
          this.cdr.detectChanges();
        } catch {}

        // nudge the viewer so the signature appears immediately
        this.forceViewerRepaint();
      });
  }

  /** Make the PDF/viewer layer repaint so the signature shows without scrolling */
  private forceViewerRepaint() {
    // 1) tiny scroll jiggle on the container, if it scrolls
    const container = document.getElementById('pdf-container');
    if (container) {
      const y = container.scrollTop || 0;
      container.scrollTo({ top: y + 1, behavior: 'auto' });
      container.scrollTo({ top: y, behavior: 'auto' });
    }

    // 2) CSS composite nudge (works even if the viewer is inside)
    requestAnimationFrame(() => {
      const el = document.querySelector(
        '#pdf-container, .pdf-viewer'
      ) as HTMLElement;
      if (!el) return;
      const prev = el.style.transform;
      el.style.willChange = 'transform';
      el.style.transform = 'translateZ(0)'; // promote to its own layer
      // revert on the next frame
      requestAnimationFrame(() => {
        el.style.transform = prev || '';
        el.style.willChange = '';
      });
    });

    // 3) As a fallback, broadcast a resize which many viewers listen to
    setTimeout(() => window.dispatchEvent(new Event('resize')), 0);

    // 4) If RXCore exposes a light refresh, call it here
    try {
      (RXCore as any)?.refresh?.(); // if available
      (RXCore as any)?.invalidate?.(); // if available
    } catch {}
  }
  startEllipseIssue(event?: MouseEvent) {
    if (event) {
      (event.target as HTMLElement)?.blur();

      this.sessionContext.showTooltip(
        event.clientX,
        event.clientY,
        'Drag your finger to mark the area of the issue'
      );
    }
    setTimeout(() => {
      document.addEventListener(
        'pointermove',
        (this.pointerMoveListener = (e: PointerEvent) => {
          this.sessionContext.updateTooltipPosition(e.clientX, e.clientY);
        })
      );
      document.addEventListener(
        'pointerup',
        (this.pointerUpListener = () => {
          this.sessionContext.hideTooltip();
          document.removeEventListener('pointermove', this.pointerMoveListener);
          document.removeEventListener('pointerup', this.pointerUpListener);
        })
      );
    }, 0);

    this.onActionSelect('SHAPE_ELLIPSE');
    this.notificationService.notification({
      message: 'Drag your finger to mark the area of the issue',
      type: 'info',
    });
  }

  startSignature() {
    this.notificationService.notification({
      message: 'Draw the signature!',
      type: 'info',
    });
    this.onActionSelect('PAINT_FREEHAND');
    this.signatureCreated = true;
  }

  openSignatureModal() {
    this.signatureModal.open();
  }

  handleSignature(svg: string) {
    console.log('Got signature SVG:', svg);

    // Example: keep it for later use
    // this.signatureSvg = svg;
  }

  // (Optional) Allow dragging signature around
  dragging = false;
  offset = { x: 0, y: 0 };

  startDrag(event: MouseEvent) {
    this.dragging = true;
    this.offset = {
      x: event.clientX - this.signaturePosition.x,
      y: event.clientY - this.signaturePosition.y,
    };

    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDrag);
  }

  onDrag = (event: MouseEvent) => {
    if (!this.dragging) return;
    this.signaturePosition = {
      x: event.clientX - this.offset.x,
      y: event.clientY - this.offset.y,
    };
  };

  stopDrag = () => {
    this.dragging = false;
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  };

  onSignatureSaved(signature: string) {
    this.signatureSaved.emit(signature); // bubble up to parent (AppComponent)
  }

  // Step 1: user saved signature → enable placement mode
  prepareSignaturePlacement(signatureDataUrl: string) {
    this.signatureImage = signatureDataUrl;
    this.placingMode = true; // waiting for user click on PDF
    this.signaturePlaced = false;
  }

  // Step 2: user clicks on PDF to place it
  placeSignature(event: MouseEvent) {
    if (!this.placingMode) return;

    const pdfContainer = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect();
    this.signaturePosition = {
      x: event.clientX - pdfContainer.left,
      y: event.clientY - pdfContainer.top,
    };

    this.signaturePlaced = true;
    this.placingMode = false; // exit placement mode
  }

  saveSignature() {
    this.savingSignature = true;

    this.saveSignatureToServer()
      .then(() => {
        RXCore.markUpSave();
        RXCore.lockMarkup(true);
        RXCore.markUpFreePen(false);

        this.signaturedSaved = true;

        this.notificationService.notification({
          message: 'Signature created successfully!',
          type: 'success',
        });

        const payload = {
          type: 'SIGNATURE_SAVE',
          payload: {
            status: 'success',
            timestamp: new Date().toISOString(),
            signedBy: this.sessionContext.username,
            orderId: this.sessionContext.orderId,
            fileId: this.sessionContext.projectId,
          },
        };
        RXCore.exportPDF();

        console.log(
          '[Angular ▶ parent] about to postMessage:',
          payload,
          'targetOrigin=',
          REACT_URL
        );

        window.parent.postMessage(payload, REACT_URL);

        // 👇 Force Angular + viewer refresh (fix for mobile)
        this.cdr.detectChanges();
        setTimeout(() => {
          const pdfContainer = document.getElementById('pdf-container');
          if (pdfContainer) {
            // this "nudges" the viewer so the signature overlay shows up immediately
            pdfContainer.style.transform = 'translateY(1px)';
            setTimeout(() => {
              pdfContainer.style.transform = '';
            }, 50);
          }
        }, 50);
      })
      .catch((error) => {
        console.error('Signature save failed:', error);
      })
      .finally(() => {
        this.savingSignature = false;
      });
  }

  guids: string[];

  deleteSignature() {
    RXCore.markUpFreePen(false);
    RXCore.lockMarkup(true);
    this.guids = RXCore.getmarkupGUIDs();
    for (const guid of this.guids) {
      RXCore.deleteMarkupbyGUID(guid);
    }
    this.startSignature();
  }

  saveSignatureToServer() {
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
      });

      const name = this.service.signerName; // { name, email }
      const email = this.service.signerEmail; // { name, email }

      const body = {
        signerName: name,
        signerEmail: email,
        // add other fields (signature data, fileId, etc.)
      };

      this.http
        .patch<any>(
          `${NEST_URL}/api/v1/universal/order/${this.sessionContext.orderId}/file`,
          body, // ✅ body goes here
          { headers } // ✅ options go here
        )
        .subscribe({
          next: (response) => {
            console.log('Issue created successfully:', response?.data?.id);
            resolve(response?.data);
          },
          error: (error) => {
            console.error('Error creating issue:', error);
            reject(error);
          },
        });
    });
  }

  updateTooltipPosition(event: MouseEvent): void {
    // Update tooltip position as the mouse moves.
    this.tooltipX = event.clientX;
    this.tooltipY = event.clientY;
  }

  hideTooltip(): void {
    // Hide the tooltip and clean up the event listeners.
    this.showTooltip = false;
    document.removeEventListener('mousemove', this.mouseMoveListener);
    document.removeEventListener('mouseup', this.mouseUpListener);
  }

  ngOnDestroy(): void {
    // Remove event listeners if the component is destroyed.
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.mouseUpListener) {
      document.removeEventListener('mouseup', this.mouseUpListener);
    }
  }

  // @HostListener('document:mousemove', ['$event'])
  // onMouseMove(e: MouseEvent) {
  //   if (this.showMouseTooltip) {
  //     this.mouseX = e.clientX;
  //     this.mouseY = e.clientY;
  //   }
  // }

  openCustomIssueModal(): void {
    this.showIssueModal = true;
  }

  closeIssueModal(): void {
    this.showIssueModal = false;
  }

  selectIssueShape(shape: string): void {
    this.onActionSelect(shape);
    this.closeIssueModal();
  }

  onExport() {
    // RXCore.markUpSave();
    // RXCore.lockMarkup(true);
    RXCore.exportPDF();
  }

  saveFreehandText() {
    if (this.isActionSelected['PAINT_FREEHAND']) {
      this.onActionSelect('PAINT_FREEHAND');
    }
    if (this.isActionSelected['TEXT']) {
      this.onActionSelect('TEXT');
    }
    RXCore.markUpSave();
    RXCore.exportPDF();
    this.notificationService.notification({
      message: 'Successfully saved!',
      type: 'success',
    });
  }

  onActionSelect(actionName: string) {
    const selected = this.isActionSelected[actionName];
    this._deselectAllActions();
    this.isActionSelected[actionName] = !selected;
    if (actionName) {
      this.rxCoreService.resetLeaderLine(true);
    }

    switch (actionName) {
      case 'TEXT':
        RXCore.setGlobalStyle(true);
        RXCore.changeStrokeColor('#000');
        RXCore.changeTextColor('#000');
        RXCore.setLineWidth(0.5);
        RXCore.markUpTextRect(this.isActionSelected[actionName]);
        break;

      case 'CALLOUT':
        RXCore.markUpTextRectArrow(this.isActionSelected[actionName]);
        break;

      case 'SHAPE_RECTANGLE':
        RXCore.setGlobalStyle(true);
        RXCore.markUpShape(this.isActionSelected[actionName], 0);
        break;

      case 'SHAPE_RECTANGLE_ROUNDED':
        RXCore.setGlobalStyle(true);
        RXCore.markUpShape(this.isActionSelected[actionName], 0, 1);
        break;

      case 'SHAPE_ELLIPSE':
        console.log('I got selected!!');
        RXCore.setGlobalStyle(true);
        RXCore.changeFillColor('#FF0000');
        RXCore.changeStrokeColor('#FF0000');
        RXCore.changeTransp(40);
        RXCore.markUpFilled();
        RXCore.setLineWidth(0);
        RXCore.markUpShape(this.isActionSelected[actionName], 1);
        break;

      case 'SHAPE_CLOUD':
        RXCore.setGlobalStyle(true);
        if (this.shapesAvailable == 1) {
          RXCore.changeFillColor('A52A2AFF');
          RXCore.markUpFilled();
          RXCore.changeTransp(20);
        }
        RXCore.markUpShape(this.isActionSelected[actionName], 2);
        break;

      case 'SHAPE_POLYGON':
        RXCore.setGlobalStyle(true);
        RXCore.markUpShape(this.isActionSelected[actionName], 3);
        break;

      case 'NOTE':
        RXCore.markUpNote(this.isActionSelected[actionName]);
        //this.service.setNotePanelState({ visible: this.isActionSelected[actionName] });
        break;

      case 'ERASE':
        RXCore.markUpErase(this.isActionSelected[actionName]);
        break;

      case 'ARROW_SINGLE_END':
        RXCore.setGlobalStyle(true);
        RXCore.markUpArrow(this.isActionSelected[actionName], 0);
        break;

      case 'ARROW_FILLED_SINGLE_END':
        RXCore.setGlobalStyle(true);
        RXCore.markUpArrow(this.isActionSelected[actionName], 1);
        break;

      case 'ARROW_BOTH_ENDS':
        RXCore.setGlobalStyle(true);
        RXCore.markUpArrow(this.isActionSelected[actionName], 2);
        break;

      case 'ARROW_FILLED_BOTH_ENDS':
        RXCore.setGlobalStyle(true);
        RXCore.markUpArrow(this.isActionSelected[actionName], 3);
        break;

      case 'PAINT_HIGHLIGHTER':
        RXCore.markUpHighlight(this.isActionSelected[actionName]);
        break;

      case 'PAINT_FREEHAND':
        RXCore.setGlobalStyle(true);
        RXCore.changeStrokeColor('#FF0000');
        RXCore.setLineWidth(4);
        RXCore.markUpFreePen(this.isActionSelected[actionName]);
        if (!this.isActionSelected[actionName]) {
          RXCore.selectMarkUp(true);
        }
        break;

      case 'PAINT_TEXT_HIGHLIGHTING':
        RXCore.textSelect(this.isActionSelected[actionName]);
        break;

      case 'PAINT_POLYLINE':
        RXCore.markUpPolyline(this.isActionSelected[actionName]);
        break;

      case 'STAMP':
        break;

      case 'SCALE_SETTING':
        this.service.setMeasurePanelState({
          visible: this.isActionSelected[actionName],
        });
        break;

      case 'IMAGES_LIBRARY':
        this.service.setImagePanelState({
          visible: this.isActionSelected[actionName],
        });
        break;
      case 'LINKS_LIBRARY':
        this.service.setLinksPanelState({
          visible: this.isActionSelected[actionName],
        });
        break;
      case 'SYMBOLS_LIBRARY':
        this.service.setSymbolPanelState({
          visible: this.isActionSelected[actionName],
        });
        break;

      /*case 'CALIBRATE':
          //RXCore.calibrate(true);
          this.calibrate(true);
          break;*/

      case 'MEASURE_CONTINUOUS':
        RXCore.markupAddMulti(this.isActionSelected[actionName]);
        break;

      case 'MEASURE_LENGTH':
        //MeasureDetailPanelComponent
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.MEASURE.LENGTH.type,
          created: true,
        });
        //this.service.setMeasurePanelState({ visible: true });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup: MARKUP_TYPES.MEASURE.LENGTH,  readonly: false });
        RXCore.markUpDimension(this.isActionSelected[actionName], 0);
        break;

      case 'MEASURE_AREA':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.MEASURE.AREA.type,
          created: true,
        });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup: MARKUP_TYPES.MEASURE.AREA, readonly: false });
        RXCore.markUpArea(this.isActionSelected[actionName]);
        break;

      case 'MEASURE_PATH':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.MEASURE.PATH.type,
          created: true,
        });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup:  MARKUP_TYPES.MEASURE.PATH, readonly: false });
        RXCore.markupMeasurePath(this.isActionSelected[actionName]);
        break;
      case 'MEASURE_RECTANGULAR_AREA':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.SHAPE.RECTANGLE.type,
          created: true,
        });
        RXCore.markupAreaRect(this.isActionSelected[actionName]);
        break;
      case 'SNAP':
        RXCore.changeSnapState(this.isActionSelected[actionName]);
        break;
      case 'COUNT':
        if (!this.isActionSelected[actionName]) {
          RXCore.markupCount(this.isActionSelected[actionName]);
        }
        break;
      case 'MARKUP_LOCK':
        RXCore.lockMarkup(this.isActionSelected[actionName]);
        break;

      case 'NO_SCALE':
        RXCore.useNoScale(this.isActionSelected[actionName]);
        RXCore.markUpRedraw();
        break;
    }
  }

  onPaintClick(): void {
    if (this.isActionSelected['PAINT_FREEHAND']) {
      this.onActionSelect('PAINT_FREEHAND');
    }
  }

  onAction(undo: boolean) {
    if (undo) RXCore.markUpUndo();
    else RXCore.markUpRedo();
  }

  /*calibrate(selected) {

    RXCore.onGuiCalibratediag(onCalibrateFinished);

    let rxCoreSvc = this.rxCoreService;

    function onCalibrateFinished(data) {
      console.log("data app", data);
        //$rootScope.$broadcast(RXCORE_EVENTS.CALIBRATE_FINISHED, data);
        rxCoreSvc.setCalibrateFinished(true, data)
    }

    RXCore.calibrate(selected);
  }*/

  confirmAnnotation() {
    // if (this.annotation && this.annotation.type) {
    this.annotationCreated = false;
    this.service.setOpenIssueForm(true);
    this.service.setPropertiesPanelState({ visible: true, readonly: false });
    RXCore.lockMarkup(true);
    // }
  }
}
