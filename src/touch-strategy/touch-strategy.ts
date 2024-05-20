import { PointCal } from "point2point";
import { Point } from "src";
import { BoardCamera } from "src/board-camera/interface";
import { PanHandler } from "src/board-camera/pan";
import { ZoomHandler } from "src/board-camera/zoom";
import { BoardInputEvent, InputCallBackList } from "src/input-observer";
export interface BoardTouchStrategyV2 {
    disabled: boolean;
    alignCoordinateSystem: boolean;
    panDisabled: boolean;
    zoomDisabled: boolean;
    rotateDisabled: boolean;
    panHandler: PanHandler;
    zoomHandler: ZoomHandler;
    camera: BoardCamera;
    updateCamera(camera: BoardCamera): void;
    updatePanHandler(panHandler: PanHandler): void;
    updateZoomHandler(zoomHandler: ZoomHandler): void;
    enableStrategy(): void;
    disableStrategy(): void;
    setUp(): void;
    tearDown(): void;
    onInput<K extends keyof BoardInputEvent>(event: K, callback: (event: BoardInputEvent[K])=>void): void;
}

export class DefaultTouchStrategy implements BoardTouchStrategyV2 {

    private touchPoints: Point[];
    private controlCamera: BoardCamera;
    private canvas: HTMLCanvasElement;
    private _disabled: boolean;
    private _alignCoordinateSystem: boolean;
    private _panDisabled: boolean = false;
    private _zoomDisabled: boolean = false;
    private _rotateDisabled: boolean = false;
    private zoomStartDist: number;

    private _panHandler: PanHandler;
    private _zoomHandler: ZoomHandler;

    private isDragging: boolean = false;
    private dragStartPoint: Point;
    private tapPoint: Point;


    private ZOOM_SENSATIVITY: number = 0.005;

    private panInputCallBackList: InputCallBackList<"pan"> = [];
    private zoomInputCallBackList: InputCallBackList<"zoom"> = [];

    constructor(canvas: HTMLCanvasElement, controlCamera: BoardCamera, panHandler: PanHandler, zoomHandler: ZoomHandler, alignCoordinateSystem: boolean = true){
        this.controlCamera = controlCamera;
        this.canvas = canvas;
        this._disabled = false;
        this.touchPoints = [];
        this.zoomStartDist = 0;
        this.isDragging = false;
        this.dragStartPoint = {x: 0, y: 0};
        this._alignCoordinateSystem = alignCoordinateSystem;
        
        this._panHandler = panHandler;
        this._zoomHandler = zoomHandler;

        this.bindListeners();
    }

    bindListeners(): void{
        this.touchstartHandler = this.touchstartHandler.bind(this);
        this.touchendHandler = this.touchendHandler.bind(this);
        this.touchcancelHandler = this.touchcancelHandler.bind(this);
        this.touchmoveHandler = this.touchmoveHandler.bind(this);
    }

    resetAttributes(): void{
        this.touchPoints = [];
        this.zoomStartDist = 0;
        this.isDragging = false;
        this.dragStartPoint = null;
        this.tapPoint = null;
    }

    enableStrategy(): void {
        this._disabled = false;
    }

    disableStrategy(): void {
        this.resetAttributes();
        this._disabled = true;
    }

    setUp(): void {
        this.canvas.addEventListener('touchstart', this.touchstartHandler);
        this.canvas.addEventListener('touchend', this.touchendHandler);
        this.canvas.addEventListener('touchcancel', this.touchcancelHandler);
        this.canvas.addEventListener('touchmove', this.touchmoveHandler);
    }

    tearDown(): void {
        this.resetAttributes();
        this.canvas.removeEventListener('touchstart', this.touchstartHandler);
        this.canvas.removeEventListener('touchend', this.touchendHandler);
        this.canvas.removeEventListener('touchcancel', this.touchcancelHandler);
        this.canvas.removeEventListener('touchmove', this.touchmoveHandler);
    }

    get disabled(): boolean {
        return this._disabled;
    }

    get alignCoordinateSystem(): boolean {
        return this._alignCoordinateSystem;
    }

    set alignCoordinateSystem(alignCoordinateSystem: boolean){
        this._alignCoordinateSystem = alignCoordinateSystem;
    }

    get panDisabled(): boolean {
        return this._panDisabled;
    }

    set panDisabled(panDisabled: boolean){
        this._panDisabled = panDisabled;
    }

    get zoomDisabled(): boolean {
        return this._zoomDisabled;
    }

    set zoomDisabled(zoomDisabled: boolean){
        this._zoomDisabled = zoomDisabled;
    }

    get rotateDisabled(): boolean {
        return this._rotateDisabled;
    }

    set rotateDisabled(rotateDisabled: boolean){
        this._rotateDisabled = rotateDisabled;
    }

    set panHandler(panHandler: PanHandler){
        this._panHandler = panHandler;
    }

    get panHandler(): PanHandler {
        return this._panHandler;
    }

    set zoomHandler(zoomHandler: ZoomHandler){
        this._zoomHandler = zoomHandler;
    }

    get zoomHandler(): ZoomHandler {
        return this._zoomHandler;
    }

    get camera(): BoardCamera {
        return this.controlCamera;
    }

    set camera(camera: BoardCamera){
        this.controlCamera = camera;
    }

    updateCamera(camera: BoardCamera): void {
        this.controlCamera = camera;
    }

    touchstartHandler(e: TouchEvent){
        if(this._disabled) {
            return;
        }
        e.preventDefault();
        if(e.targetTouches.length === 2){
            this.isDragging = false;
            let firstTouchPoint = {x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY};
            let secondTouchPoint = {x: e.targetTouches[1].clientX, y: e.targetTouches[1].clientY};
            this.zoomStartDist = PointCal.distanceBetweenPoints(firstTouchPoint, secondTouchPoint);
            this.touchPoints = [firstTouchPoint, secondTouchPoint];
        } else if (e.targetTouches.length === 1){
            this.tapPoint = {x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY};
            this.tapPoint = this.controlCamera.convertFromViewPort2WorldSpace(this.convertWindowPoint2ViewPortPoint({x: this.canvas.getBoundingClientRect().left, y: this.canvas.getBoundingClientRect().top}, this.tapPoint));
            this.isDragging = true;
            this.dragStartPoint = {x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY};
        }
    }

    touchcancelHandler(e: TouchEvent){
        if(this._disabled) {
            return;
        }
        this.isDragging = false;
        this.touchPoints = [];
    }

    touchendHandler(e: TouchEvent){
        if(this._disabled) {
            return;
        }
        this.isDragging = false;
        this.touchPoints = [];
    }

    touchmoveHandler(e: TouchEvent){
        if(this._disabled) {
            return;
        }
        e.preventDefault();
        if(e.targetTouches.length == 2 && this.touchPoints.length == 2){
            //NOTE Touch Zooming
            if(this._zoomDisabled){
                return;
            }
            let startPoint = {x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY};
            let endPoint = {x: e.targetTouches[1].clientX, y: e.targetTouches[1].clientY};
            let touchPointDist = PointCal.distanceBetweenPoints(startPoint, endPoint);
            let distDiff = this.zoomStartDist - touchPointDist;
            let midPoint = PointCal.linearInterpolation(startPoint, endPoint, 0.5);
            if(this._alignCoordinateSystem){
                midPoint = this.convertWindowPoint2ViewPortPoint({x: this.canvas.getBoundingClientRect().left, y: this.canvas.getBoundingClientRect().top}, midPoint);
            } else {
                midPoint = this.convertWindowPoint2ViewPortPoint({x: this.canvas.getBoundingClientRect().left, y: this.canvas.getBoundingClientRect().bottom}, midPoint);
            }
            let zoomAmount = distDiff * 0.1 * this.controlCamera.zoomLevel * this.ZOOM_SENSATIVITY;
            this.zoomInputCallBackList.forEach((callback)=>{
                callback({deltaZoomAmount: zoomAmount, anchorPoint: midPoint});
            });
            this._zoomHandler.zoomCameraToAt(this.controlCamera, this.controlCamera.zoomLevel - zoomAmount, midPoint);
            // this.controlCamera.setZoomLevelWithClampFromGestureAtAnchorPoint(this.controlCamera.getZoomLevel() - zoomAmount, midPoint);
            this.touchPoints = [startPoint, endPoint];
            this.tapPoint = null;
        } else if(e.targetTouches.length == 1 && this.isDragging && !this._panDisabled){
            let touchPoint = {x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY};
            let diff = PointCal.subVector(this.dragStartPoint, touchPoint);
            if(!this._alignCoordinateSystem){
                diff = PointCal.flipYAxis(diff);
            }
            let diffInWorld = PointCal.rotatePoint(diff, this.controlCamera.rotation);
            diffInWorld = PointCal.multiplyVectorByScalar(diffInWorld, 1 / this.controlCamera.zoomLevel);
            this.panInputCallBackList.forEach((callback)=>{
                callback({diff: diffInWorld});
            });
            this._panHandler.panCameraBy(this.camera, diffInWorld);
            // this.controlCamera.moveWithClampFromGesture(diffInWorld);
            this.dragStartPoint = touchPoint;
            this.tapPoint = null;
        }
    }

    convertWindowPoint2ViewPortPoint(bottomLeftCornerOfCanvas: Point, clickPointInWindow: Point): Point {
        const res = PointCal.subVector(clickPointInWindow, bottomLeftCornerOfCanvas);
        if(this._alignCoordinateSystem) {
            return {x: res.x, y: res.y};
        } else {
            return {x: res.x, y: -res.y};
        }
    }

    updatePanHandler(panHandler: PanHandler): void {
        this._panHandler = panHandler;
    }

    updateZoomHandler(zoomHandler: ZoomHandler): void {
        this._zoomHandler = zoomHandler;
    }

    onInput<K extends keyof BoardInputEvent>(event: K, callback: (event: BoardInputEvent[K]) => void): void {
        switch(event){
        case "pan":
            this.panInputCallBackList.push(callback as (event: BoardInputEvent["pan"])=>void);
            break;
        case "zoom":
            this.zoomInputCallBackList.push(callback as (event: BoardInputEvent["zoom"])=>void);
            break;
        case "rotate":
            break;
        default:
            throw new Error("Invalid event type");
        }
    }
}
