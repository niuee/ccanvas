import { Point } from "src/index";
import { TouchPoints } from "./touch-input-state-machine";
import { RawUserInputObservable } from "src/input-observer";
export interface TouchContext {
    addTouchPoints: (points: TouchPoints[]) => void;
    removeTouchPoints: (idents: number[]) => void;
    getCurrentTouchPointsCount: () => number;
    getInitialTouchPointsPositions: (idents: number[]) => TouchPoints[];
    updateTouchPoints: (pointsMoved: TouchPoints[]) => void;
    notifyOnPan: (delta: Point) => void;
    notifyOnZoom: (zoomAmount: number, anchorPoint: Point) => void; 
    canvas: HTMLCanvasElement;
}

export class TouchInputTracker implements TouchContext {

    private _inputObserver: RawUserInputObservable;
    private _touchPointsMap: Map<number, TouchPoints> = new Map<number, TouchPoints>();
    private _canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement, inputObserver: RawUserInputObservable) {
        this._canvas = canvas;
        this._inputObserver = inputObserver;
    }

    addTouchPoints(points: TouchPoints[]): void {
        points.forEach((point)=>{
            this._touchPointsMap.set(point.ident, {...point});
        });
    }

    removeTouchPoints(identifiers: number[]): void {
        identifiers.forEach((ident)=>{
            if(this._touchPointsMap.has(ident)){
                this._touchPointsMap.delete(ident);
            }
        });
    }

    getCurrentTouchPointsCount(): number {
        return this._touchPointsMap.size;
    }

    getInitialTouchPointsPositions(idents: number[]): TouchPoints[] {
        const res: TouchPoints[] = [];
        idents.forEach((ident)=>{
            if(this._touchPointsMap.has(ident)){
                res.push(this._touchPointsMap.get(ident));
            }
        });
        return res; 
    }

    updateTouchPoints(pointsMoved: TouchPoints[]): void {
        pointsMoved.forEach((point)=>{
            if(this._touchPointsMap.has(point.ident)){
                this._touchPointsMap.set(point.ident, {...point});
            }
        });
    }

    notifyOnPan(delta: Point): void {
        this._inputObserver.notifyPan(delta);
    }

    notifyOnZoom(zoomAmount: number, anchorPoint: Point): void {
        this._inputObserver.notifyZoom(zoomAmount, anchorPoint);
    }

    get canvas(): HTMLCanvasElement {
        return this._canvas;
    }
}

