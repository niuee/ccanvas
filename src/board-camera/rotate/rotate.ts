import { normalizeAngleZero2TwoPI, rotationWithinLimits, angleSpan, clampRotation } from "src/board-camera/utils/rotation";
import { BoardCamera } from "src/board-camera/interface"

export interface RotationHandler {
    nextHandler?: RotationHandler;
    camera: BoardCamera;
    chainHandler(handler: RotationHandler): RotationHandler;
    rotateTo(targetRotation: number): void
    rotateBy(delta: number): void
}

export interface RotationController extends RotationHandler {
    restrictRotation: boolean;
}

export abstract class RotationHandlerBoilerPlate implements RotationHandler {

    protected _camera: BoardCamera;
    private _nextHandler?: RotationHandler;

    constructor(camera: BoardCamera){
        this._camera = camera;
    }

    set camera(camera: BoardCamera) {
        this._camera = camera;
    }

    get camera(): BoardCamera {
        return this._camera;
    }

    set nextHandler(handler: RotationHandler | undefined) {
        this._nextHandler = handler;
    }

    get nextHandler(): RotationHandler | undefined {
        return this._nextHandler;
    }

    chainHandler(handler: RotationHandler): RotationHandler {
        this._nextHandler = handler;
        return handler;
    }

    rotateTo(targetRotation: number): void {
        if(this._nextHandler){
            this._nextHandler.rotateTo(targetRotation);
        }
    }

    rotateBy(delta: number): void {
        if(this._nextHandler){
            this._nextHandler.rotateBy(delta);
        }
    }

}

export class BaseRotationHandler extends RotationHandlerBoilerPlate{

    constructor(camera: BoardCamera) {
        super(camera);
    }

    rotateTo(targetRotation: number): void{
        targetRotation = normalizeAngleZero2TwoPI(targetRotation);
        this._camera.setRotation(targetRotation);
    }

    rotateBy(diff: number): void {
        const curRotation = this._camera.rotation;
        const targetRotation = normalizeAngleZero2TwoPI(curRotation + diff);
        diff = angleSpan(curRotation, targetRotation);
        this._camera.setRotation(targetRotation);
    }
}

export class RotationRestrictionHandler extends RotationHandlerBoilerPlate{

    private _restrictRotation: boolean = false;

    constructor(camera: BoardCamera) {
        super(camera);
    }

    get restrictRotation(): boolean{
        return this._restrictRotation;
    }

    set restrictRotation(restrictRotation: boolean){
        this._restrictRotation = restrictRotation;
    }

    rotateBy(diff: number): void {
        if(this._restrictRotation){
            return;
        }
        super.rotateBy(diff);
    }

    rotateTo(targetRotation: number): void {
        if(this._restrictRotation){
            return;
        }
        super.rotateTo(targetRotation);
    }
}

export class RotationClampHandler extends RotationHandlerBoilerPlate{
    

    constructor(camera: BoardCamera) {
        super(camera);
    }

    rotateBy(diff: number): void {
        const curRotation = this._camera.rotation;
        let targetRotation = normalizeAngleZero2TwoPI(curRotation + diff);
        targetRotation = clampRotation(targetRotation, this._camera.rotationBoundaries); 
        diff = angleSpan(curRotation, targetRotation);
        super.rotateBy(diff);
    }

    rotateTo(targetRotation: number): void {
        targetRotation = normalizeAngleZero2TwoPI(targetRotation);
        targetRotation = clampRotation(targetRotation, this._camera.rotationBoundaries);
        super.rotateTo(targetRotation);
    }
}

export class RotateRig extends RotationHandlerBoilerPlate {

    private _baseHandler: BaseRotationHandler;
    private _clampHandler: RotationClampHandler;
    private _restrictionHandler: RotationRestrictionHandler;

    constructor(camera: BoardCamera) {
        super(camera);
        this._restrictionHandler = new RotationRestrictionHandler(camera);
        this._baseHandler = new BaseRotationHandler(camera);
        this._clampHandler = new RotationClampHandler(camera);
        this._restrictionHandler.chainHandler(this._clampHandler).chainHandler(this._baseHandler);
    }

    rotateBy(diff: number): void {
        this._restrictionHandler.rotateBy(diff);
        super.rotateBy(diff);
    }

    rotateTo(targetRotation: number): void {
        this._restrictionHandler.rotateTo(targetRotation);
        super.rotateTo(targetRotation);
    }
}
