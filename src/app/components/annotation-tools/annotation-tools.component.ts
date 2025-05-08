import {Component, HostListener, OnInit, ViewEncapsulation} from '@angular/core';
import {AnnotationToolsService} from './annotation-tools.service';
import {RXCore} from 'src/rxcore';
import {RxCoreService} from 'src/app/services/rxcore.service';
import {MARKUP_TYPES} from 'src/rxcore/constants';
import {IGuiConfig} from 'src/rxcore/models/IGuiConfig';
import {UserService} from '../user/user.service';
import {firstValueFrom, lastValueFrom} from 'rxjs';
import {SessionContextService} from "../../services/session-context.service";
import {NotificationService} from "../notification/notification.service";
import {GuiMode} from "../../../rxcore/enums/GuiMode";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {NEST_URL} from "../../constants";



@Component({
  selector: 'rx-annotation-tools',
  templateUrl: './annotation-tools.component.html',
  styleUrls: ['./annotation-tools.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AnnotationToolsComponent implements OnInit {
  guiConfig$ = this.rxCoreService.guiConfig$;
  opened$ = this.service.opened$;
  guiConfig: IGuiConfig | undefined;
  shapesAvailable: number = 5;
  showIssueModal = false;
  annotationCreated: boolean = false;
  mode: string;
  signatureCreated: boolean = false;

  operation: any;
  annotation: any;
  snap: any;


  isActionSelected = {
    "TEXT": false,
    "CALLOUT": false,
    "SHAPE_RECTANGLE": false,
    "SHAPE_RECTANGLE_ROUNDED": false,
    "SHAPE_ELLIPSE": false,
    "SHAPE_CLOUD": false,
    "SHAPE_POLYGON": false,
    "NOTE": false,
    "ERASE": false,
    "ARROW_FILLED_BOTH_ENDS": false,
    "ARROW_FILLED_SINGLE_END": false,
    "ARROW_BOTH_ENDS": false,
    "ARROW_SINGLE_END": false,
    "PAINT_HIGHLIGHTER": false,
    "PAINT_FREEHAND": false,
    "PAINT_TEXT_HIGHLIGHTING": false,
    "PAINT_POLYLINE": false,
    "COUNT": false,
    "STAMP": false,
    "SCALE_SETTING": false,
    "IMAGES_LIBRARY": false,
    "SYMBOLS_LIBRARY": false,
    "LINKS_LIBRARY": false,
    "CALIBRATE": false,
    "MEASURE_CONTINUOUS": false,
    "MEASURE_LENGTH": false,
    "MEASURE_AREA": false,
    "MEASURE_PATH": false,
    "SNAP": false,
    "MARKUP_LOCK": false,
    "NO_SCALE": false
  };

  get isPaintSelected(): boolean {
    return this.isActionSelected["PAINT_HIGHLIGHTER"]
      || this.isActionSelected["PAINT_FREEHAND"]
      || this.isActionSelected["PAINT_TEXT_HIGHLIGHTING"]
      || this.isActionSelected["PAINT_POLYLINE"];
  }

  get isShapeSelected(): boolean {
    return this.isActionSelected["SHAPE_RECTANGLE"]
      || this.isActionSelected["SHAPE_RECTANGLE_ROUNDED"]
      || this.isActionSelected["SHAPE_ELLIPSE"]
      || this.isActionSelected["SHAPE_CLOUD"]
      || this.isActionSelected["SHAPE_POLYGON"];
  };

  get isArrowSelected(): boolean {
    return this.isActionSelected["ARROW_FILLED_BOTH_ENDS"]
      || this.isActionSelected["ARROW_FILLED_SINGLE_END"]
      || this.isActionSelected["ARROW_BOTH_ENDS"]
      || this.isActionSelected["ARROW_SINGLE_END"];
  };

  get isMeasureSelected(): boolean {
    return this.isActionSelected["MEASURE_LENGTH"]
      || this.isActionSelected["MEASURE_AREA"]
      || this.isActionSelected["MEASURE_PATH"];
  };

  canAddAnnotation = this.userService.canAddAnnotation$;
  canUpdateAnnotation = this.userService.canUpdateAnnotation$;
  canDeleteAnnotation = this.userService.canDeleteAnnotation$;

  constructor(
    public readonly service: AnnotationToolsService,
    private readonly rxCoreService: RxCoreService,
    private readonly userService: UserService,
    public sessionContext: SessionContextService,
    private readonly notificationService: NotificationService,
    private http: HttpClient,
  ) {
  }

  ngOnInit(): void {
    console.log('SELLL----kjdsf===ksdjf==++', this.rxCoreService.getSelectedMarkup())

    this.guiConfig$.subscribe(config => {
      this.guiConfig = config;

      this.shapesAvailable = Number(!this.guiConfig.disableMarkupShapeRectangleButton)
        + Number(!this.guiConfig.disableMarkupShapeRoundedRectangleButton)
        + Number(!this.guiConfig.disableMarkupShapeEllipseButton)
        + Number(!this.guiConfig.disableMarkupShapeCloudButton)
        + Number(!this.guiConfig.disableMarkupShapePolygonButton);
    });

    this.rxCoreService.guiState$.subscribe(state => {
      this._deselectAllActions();
      //this.service.setNotePanelState({ visible: false });
      //this.service.hideQuickActionsMenu();
      //this.service.setNotePopoverState({visible: false, markup: -1});
      //this.service.hide();
      //this.service.setMeasurePanelState({ visible: false });
    });

    this.rxCoreService.guiTextInput$.subscribe(({rectangle, operation}) => {
      if (operation === -1) return;

      if (operation.start) {
        this._deselectAllActions();
      }


    });

    this.rxCoreService.guiMarkup$.subscribe(({markup, operation}) => {
      console.log("-23482359=-0dfgkj")
      if (markup !== -1) {
        if (markup.type == MARKUP_TYPES.COUNT.type) return;
        if (markup.type == MARKUP_TYPES.STAMP.type) {
          if (operation?.created) return;
          this.isActionSelected["STAMP"] = false;
        }
      }
    })

    this.rxCoreService.guiMarkup$.subscribe(({markup, operation}) => {
      console.log('Operation created!', {markup, operation});
      if (markup !== -1) {
        if (markup.type == MARKUP_TYPES.COUNT.type) return;
        if (markup.type == MARKUP_TYPES.STAMP.type) {
          if (operation?.created) return;
          this.isActionSelected["STAMP"] = false;
        }
      }


      if (markup === -1 || operation?.created) {
        const selectedAction = Object.entries(this.isActionSelected).find(([key, value]) => value);
        console.log('selectedAction', selectedAction)
        //console.log("reset to default tool here");
        if (operation?.created) {
          this.annotationCreated = true;
          this._deselectAllActions();
        }
        //this._deselectAllActions();


        if (operation?.created && this.shapesAvailable == 1 && selectedAction) {
          this.onActionSelect(selectedAction[0]);
        }
      }
      this.rxCoreService.setSelectedMarkup(markup);

    });

    this.service.measurePanelState$.subscribe(state => {

      this.isActionSelected['SCALE_SETTING'] = state.visible;

      /*if(state.visible && this.isActionSelected['SCALE_SETTING'] === false){
        // this.onActionSelect('SCALE_SETTING');
        this.isActionSelected['SCALE_SETTING'] = true;
      }*/
    });

    this.service.imagePanelState$.subscribe(state => {
      this.isActionSelected['IMAGES_LIBRARY'] = state.visible;
    });
    this.service.symbolPanelState$.subscribe(state => {
      this.isActionSelected['SYMBOLS_LIBRARY'] = state.visible;
    });
    this.service.linkPanelState$.subscribe(state => {
      this.isActionSelected['LINKS_LIBRARY'] = state.visible;
    });


    this.service.snapState$.subscribe(state => {
      if (state) {
        this.isActionSelected['SNAP'] = state;
      }
    });

  }

  private _deselectAllActions(): void {
    Object.entries(this.isActionSelected).forEach(([key, value]) => {


      if (key !== 'MARKUP_LOCK' && key !== 'SNAP' && key !== 'NO_SCALE' && key !== "MEASURE_CONTINUOUS") {
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

    console.log({mode: this.sessionContext.mode, signed: this.sessionContext.isSigned})
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

  startEllipseIssue(event?: MouseEvent) {
    if (event) {

      (event.target as HTMLElement)?.blur();

      this.sessionContext.showTooltip(event.clientX, event.clientY, 'Drag your finger to mark the area of the issue');

    }
    setTimeout(() => {
      document.addEventListener('pointermove', this.pointerMoveListener = (e: PointerEvent) => {
        this.sessionContext.updateTooltipPosition(e.clientX, e.clientY);
      });
      document.addEventListener('pointerup', this.pointerUpListener = () => {
        this.sessionContext.hideTooltip();
        document.removeEventListener('pointermove', this.pointerMoveListener);
        document.removeEventListener('pointerup', this.pointerUpListener);
      });
    }, 0);

    this.onActionSelect('SHAPE_ELLIPSE');
    this.notificationService.notification({message: 'Drag your finger to mark the area of the issue', type: 'info'});
  }

  startSignature() {
    this.notificationService.notification({message: 'Draw the signature!', type: 'info'})
    this.onActionSelect('PAINT_FREEHAND')
    this.signatureCreated = true;
  }

  saveSignature() {
    this.savingSignature = true;

    this.saveSignatureToServer().then(() => {
      RXCore.markUpFreePen(false);
      RXCore.lockMarkup(true);
      RXCore.markUpSave();

      this.signaturedSaved = true;

      this.notificationService.notification({
        message: 'Signature created successfully!',
        type: 'success'
      });

      // âœ… Send postMessage to parent (React)
      window.parent.postMessage({
        type: 'SIGNATURE_SAVE',
        payload: {
          status: 'success',
          timestamp: new Date().toISOString(),
          signedBy: this.sessionContext.username,
          orderId: this.sessionContext.orderId,
          fileId: this.sessionContext.projectId, // or actual file ID if you have it
        }
      }, '*'); // You can restrict origin instead of '*'

    }).catch((error) => {
      console.log(error);
    }).finally(() => {
      this.savingSignature = false;
    });
  }

  guids: string[];

  deleteSignature() {
    RXCore.markUpFreePen(false)
    RXCore.lockMarkup(true)
    this.guids = RXCore.getmarkupGUIDs()
    for (const guid of this.guids) {
      RXCore.deleteMarkupbyGUID(guid)
    }
    this.startSignature()
  }

  saveSignatureToServer() {
    // Return issueId
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders();
      this.http
        .patch<any>(
          `${NEST_URL}/api/v1/universal/order/${this.sessionContext.orderId}/file`,
          {headers}
        )
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


  onActionSelect(actionName: string) {
    const selected = this.isActionSelected[actionName];
    this._deselectAllActions();
    this.isActionSelected[actionName] = !selected;
    if (actionName) {
      this.rxCoreService.resetLeaderLine(true);
    }


    switch (actionName) {
      case 'TEXT':
        RXCore.markUpTextRect(this.isActionSelected[actionName])
        break;

      case 'CALLOUT':
        RXCore.markUpTextRectArrow(this.isActionSelected[actionName])
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
        console.log("I got selected!!")
        RXCore.setGlobalStyle(true);
        RXCore.markUpShape(this.isActionSelected[actionName], 1);
        break;

      case 'SHAPE_CLOUD':
        RXCore.setGlobalStyle(true);
        if (this.shapesAvailable == 1) {
          RXCore.changeFillColor("A52A2AFF");
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
        this.service.setMeasurePanelState({visible: this.isActionSelected[actionName]});
        break;

      case 'IMAGES_LIBRARY':
        this.service.setImagePanelState({visible: this.isActionSelected[actionName]});
        break;
      case 'LINKS_LIBRARY':
        this.service.setLinksPanelState({visible: this.isActionSelected[actionName]});
        break;
      case 'SYMBOLS_LIBRARY':
        this.service.setSymbolPanelState({visible: this.isActionSelected[actionName]});
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
          created: true
        });
        //this.service.setMeasurePanelState({ visible: true });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup: MARKUP_TYPES.MEASURE.LENGTH,  readonly: false });
        RXCore.markUpDimension(this.isActionSelected[actionName], 0);
        break;

      case 'MEASURE_AREA':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.MEASURE.AREA.type,
          created: true
        });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup: MARKUP_TYPES.MEASURE.AREA, readonly: false });
        RXCore.markUpArea(this.isActionSelected[actionName]);
        break;

      case 'MEASURE_PATH':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.MEASURE.PATH.type,
          created: true
        });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup:  MARKUP_TYPES.MEASURE.PATH, readonly: false });
        RXCore.markupMeasurePath(this.isActionSelected[actionName]);
        break;
      case 'MEASURE_RECTANGULAR_AREA':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.SHAPE.RECTANGLE.type,
          created: true
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
      case 'MARKUP_LOCK' :
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
    this.service.setOpenIssueForm(true)
    this.service.setPropertiesPanelState({visible: true, readonly: false});
    RXCore.lockMarkup(true)
    // }
  }


}
