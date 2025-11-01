// by tradingview's light-weight-charts plugins example
import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
    Coordinate,
    IChartApi,
    isBusinessDay,
    ISeriesApi,
    ISeriesPrimitiveAxisView,
    IPrimitivePaneRenderer,
    IPrimitivePaneView,
    MouseEventParams,
    PrimitivePaneViewZOrder,
    SeriesType,
    Time,
    Logical,
} from 'lightweight-charts';
import { ensureDefined } from './plugins/helpers/assertions';
import { PluginBase } from './plugins/plugins/plugin-base';
import { positionsBox } from './plugins/helpers/dimensions/positions';

class RectanglePaneRenderer implements IPrimitivePaneRenderer {
    _p1: ViewPoint;
    _p2: ViewPoint;
    _fillColor: string;

    constructor(p1: ViewPoint, p2: ViewPoint, fillColor: string) {
        this._p1 = p1;
        this._p2 = p2;
        this._fillColor = fillColor;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace(scope => {
            if (
                this._p1.x === null ||
                this._p1.y === null ||
                this._p2.x === null ||
                this._p2.y === null
            )
                return;

            const ctx = scope.context;
            ctx.fillStyle = this._fillColor;
            const width = ctx.canvas.width;
            const height = ctx.canvas.height;
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#1976d2';


            // ctx.fillRect(
            //     horizontalPositions.position,
            //     verticalPositions.position,
            //     horizontalPositions.length,
            //     verticalPositions.length
            // );

            // ctx.lineWidth = 1 * scope.horizontalPixelRatio;   // 可调
            // ctx.strokeStyle = '#1976d2';     // 可设为成员变量
            // ctx.strokeRect(
            //     horizontalPositions.position,
            //     verticalPositions.position,
            //     horizontalPositions.length,
            //     verticalPositions.length
            // );


            ctx.beginPath();
            ctx.moveTo(this._p1.x, this._p1.y);
            ctx.lineTo(this._p2.x, this._p2.y);
            ctx.stroke();
        });
    }
}

interface ViewPoint {
    x: Coordinate | null;
    y: Coordinate | null;
}

class RectanglePaneView implements IPrimitivePaneView {
    _source: Rectangle;
    _p1: ViewPoint = { x: null, y: null };
    _p2: ViewPoint = { x: null, y: null };

    constructor(source: Rectangle) {
        this._source = source;
    }

    update() {
        const series = this._source.series;
        let y1 = series.priceToCoordinate(this._source._p1.price);
        let y2 = series.priceToCoordinate(this._source._p2.price);
        const timeScale = this._source.chart.timeScale();
        let x1 = timeScale.timeToCoordinate(this._source._p1.time);
        let x2 = timeScale.timeToCoordinate(this._source._p2.time);
        this._p1 = { x: x1, y: y1 };
        this._p2 = { x: x2, y: y2 };

        if (x1 && x2 && y1 && y2) {
            const k = (y2 - y1) / (x2 - x1)
            const b = y2 - k * x2
            if (x2 < x1) {
                const xl = 0;
                const yl = b;
                this._p2 = { x: xl as Coordinate, y: yl as Coordinate };
            } else {
                const width = this._source.chart.chartElement().getBoundingClientRect().width
                const xr = width;
                const yr = k * xr + b
                this._p2 = { x: xr as Coordinate, y: yr as Coordinate };
            }
        }
    }

    renderer() {
        return new RectanglePaneRenderer(
            this._p1,
            this._p2,
            this._source._options.fillColor
        );
    }
}

class RectangleAxisPaneRenderer implements IPrimitivePaneRenderer {
    _p1: number | null;
    _p2: number | null;
    _fillColor: string;
    _vertical: boolean = false;

    constructor(
        p1: number | null,
        p2: number | null,
        fillColor: string,
        vertical: boolean
    ) {
        this._p1 = p1;
        this._p2 = p2;
        this._fillColor = fillColor;
        this._vertical = vertical;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace(scope => {
            if (this._p1 === null || this._p2 === null) return;
            const ctx = scope.context;
            ctx.globalAlpha = 0.5;
            const positions = positionsBox(
                this._p1,
                this._p2,
                this._vertical ? scope.verticalPixelRatio : scope.horizontalPixelRatio
            );
            ctx.fillStyle = this._fillColor;
            if (this._vertical) {
                ctx.fillRect(0, positions.position, 15, positions.length);
            } else {
                ctx.fillRect(positions.position, 0, positions.length, 15);
            }
        });
    }
}

abstract class RectangleAxisPaneView implements IPrimitivePaneView {
    _source: Rectangle;
    _p1: number | null = null;
    _p2: number | null = null;
    _vertical: boolean = false;

    constructor(source: Rectangle, vertical: boolean) {
        this._source = source;
        this._vertical = vertical;
    }

    abstract getPoints(): [Coordinate | null, Coordinate | null];

    update() {
        [this._p1, this._p2] = this.getPoints();
    }

    renderer() {
        return new RectangleAxisPaneRenderer(
            this._p1,
            this._p2,
            this._source._options.fillColor,
            this._vertical
        );
    }
    zOrder(): PrimitivePaneViewZOrder {
        return 'bottom';
    }
}

class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
    getPoints(): [Coordinate | null, Coordinate | null] {
        const series = this._source.series;
        const y1 = series.priceToCoordinate(this._source._p1.price);
        const y2 = series.priceToCoordinate(this._source._p2.price);
        return [y1, y2];
    }
}

class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
    getPoints(): [Coordinate | null, Coordinate | null] {
        const timeScale = this._source.chart.timeScale();
        const x1 = timeScale.timeToCoordinate(this._source._p1.time);
        const x2 = timeScale.timeToCoordinate(this._source._p2.time);
        return [x1, x2];
    }
}

abstract class RectangleAxisView implements ISeriesPrimitiveAxisView {
    _source: Rectangle;
    _p: Point;
    _pos: Coordinate | null = null;
    constructor(source: Rectangle, p: Point) {
        this._source = source;
        this._p = p;
    }
    abstract update(): void;
    abstract text(): string;

    coordinate() {
        return this._pos ?? -1;
    }

    visible(): boolean {
        return this._source._options.showLabels;
    }

    tickVisible(): boolean {
        return this._source._options.showLabels;
    }

    textColor() {
        return this._source._options.labelTextColor;
    }
    backColor() {
        return this._source._options.labelColor;
    }
    movePoint(p: Point) {
        this._p = p;
        this.update();
    }
}

class RectangleTimeAxisView extends RectangleAxisView {
    update() {
        const timeScale = this._source.chart.timeScale();
        this._pos = timeScale.timeToCoordinate(this._p.time);
    }
    text() {
        return this._source._options.timeLabelFormatter(this._p.time);
    }
}

class RectanglePriceAxisView extends RectangleAxisView {
    update() {
        const series = this._source.series;
        this._pos = series.priceToCoordinate(this._p.price);
    }
    text() {
        return this._source._options.priceLabelFormatter(this._p.price);
    }
}

interface Point {
    time: Time;
    price: number;
}

export interface RectangleDrawingToolOptions {
    fillColor: string;
    previewFillColor: string;
    labelColor: string;
    labelTextColor: string;
    showLabels: boolean;
    priceLabelFormatter: (price: number) => string;
    timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: RectangleDrawingToolOptions = {
    fillColor: 'rgba(71, 182, 235, 0.25)',
    previewFillColor: 'rgba(200, 50, 100, 0.25)',
    labelColor: 'rgba(200, 50, 100, 1)',
    labelTextColor: 'white',
    showLabels: true,
    priceLabelFormatter: (price: number) => price.toFixed(2),
    timeLabelFormatter: (time: Time) => {
        if (typeof time == 'string') return time;
        const date = isBusinessDay(time)
            ? new Date(time.year, time.month, time.day)
            : new Date(time * 1000);
        return date.toLocaleDateString();
    },
};

class Rectangle extends PluginBase {
    _options: RectangleDrawingToolOptions;
    _p1: Point;
    _p2: Point;
    _paneViews: RectanglePaneView[];
    _timeAxisViews: RectangleTimeAxisView[];
    _priceAxisViews: RectanglePriceAxisView[];
    _priceAxisPaneViews: RectanglePriceAxisPaneView[];
    _timeAxisPaneViews: RectangleTimeAxisPaneView[];

    constructor(
        p1: Point,
        p2: Point,
        options: Partial<RectangleDrawingToolOptions> = {}
    ) {
        super();
        this._p1 = p1;
        this._p2 = p2;
        this._options = {
            ...defaultOptions,
            ...options,
        };
        this._paneViews = [new RectanglePaneView(this)];
        this._timeAxisViews = [
            new RectangleTimeAxisView(this, p1),
            new RectangleTimeAxisView(this, p2),
        ];
        this._priceAxisViews = [
            new RectanglePriceAxisView(this, p1),
            new RectanglePriceAxisView(this, p2),
        ];
        this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
        this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
    }

    updateAllViews() {
        this._paneViews.forEach(pw => pw.update());
        this._timeAxisViews.forEach(pw => pw.update());
        this._priceAxisViews.forEach(pw => pw.update());
        this._priceAxisPaneViews.forEach(pw => pw.update());
        this._timeAxisPaneViews.forEach(pw => pw.update());
    }

    priceAxisViews() {
        return this._priceAxisViews;
    }

    timeAxisViews() {
        return this._timeAxisViews;
    }

    paneViews() {
        return this._paneViews;
    }

    priceAxisPaneViews() {
        return this._priceAxisPaneViews;
    }

    timeAxisPaneViews() {
        return this._timeAxisPaneViews;
    }

    applyOptions(options: Partial<RectangleDrawingToolOptions>) {
        this._options = { ...this._options, ...options };
        this.requestUpdate();
    }
}

class PreviewRectangle extends Rectangle {
    constructor(
        p1: Point,
        p2: Point,
        options: Partial<RectangleDrawingToolOptions> = {}
    ) {
        super(p1, p2, options);
        this._options.fillColor = this._options.previewFillColor;
    }

    public updateEndPoint(p: Point) {
        this._p2 = p;
        this._paneViews[0].update();
        this._timeAxisViews[1].movePoint(p);
        this._priceAxisViews[1].movePoint(p);
        this.requestUpdate();
    }
}

export class TrendLineDrawingTool {
    private _chart: IChartApi | undefined;
    private _series: ISeriesApi<SeriesType> | undefined;
    // private _drawingsToolbarContainer: HTMLDivElement | undefined;
    private _defaultOptions: Partial<RectangleDrawingToolOptions>;
    private _rectangles: Rectangle[];
    private _previewRectangle: PreviewRectangle | undefined = undefined;
    private _points: Point[] = [];
    private _p1Index = 0;
    private _p2Index = 0;
    private _drawing: boolean = false;
    private _onDrawingComplete: () => void;
    // private _toolbarButton: HTMLDivElement | undefined;

    constructor(
        chart: IChartApi,
        series: ISeriesApi<SeriesType>,
        // drawingsToolbarContainer: HTMLDivElement,
        onDrawingComplete: () => void,
        options: Partial<RectangleDrawingToolOptions>
    ) {
        this._chart = chart;
        this._series = series;
        this._onDrawingComplete = onDrawingComplete;
        // this._drawingsToolbarContainer = drawingsToolbarContainer;
        //this._addToolbarButton();
        this._defaultOptions = options;
        this._rectangles = [];
        this._chart.chartElement().addEventListener('mousedown', this._mousedownHandler);
        this._chart.chartElement().addEventListener('mouseup', this._mouseupHandler)
        this._chart.subscribeCrosshairMove(this._moveHandler);
    }

    private _mousedownHandler = (param: MouseEvent) => this._onMouseDown(param);
    private _mouseupHandler = (param: MouseEvent) => this._onMouseUp(param);
    private _moveHandler = (param: MouseEventParams) => this._onMouseMove(param);

    remove() {
        this.stopDrawing();
        if (this._chart) {
            this._chart.unsubscribeCrosshairMove(this._moveHandler);
        }
        this._rectangles.forEach(rectangle => {
            this._removeRectangle(rectangle);
        });
        this._rectangles = [];
        this._removePreviewRectangle();
        this._chart = undefined;
        this._series = undefined;
        // this._drawingsToolbarContainer = undefined;
    }

    startDrawing(): void {
        this._drawing = true;
        this._points = [];
        // if (this._toolbarButton) {
        //     this._toolbarButton.style.fill = 'rgb(100, 150, 250)';
        // }
    }

    stopDrawing(): void {
        this._drawing = false;
        this._points = [];
        this._removePreviewRectangle()
        // if (this._toolbarButton) {
        //     this._toolbarButton.style.fill = 'rgb(0, 0, 0)';
        // }
    }

    isDrawing(): boolean {
        return this._drawing;
    }

    private _onMouseDown(param: MouseEvent) {
        const rect = this._chart?.chartElement().getBoundingClientRect();
        if (!rect) return;
        const time = this._chart?.timeScale().coordinateToTime(param.x - rect.left);

        const point = {
            x: param.x - rect.left,
            y: param.y - rect.top,
        };

        if (!this._drawing || !point || !time || !this._series) return;
        this._chart?.applyOptions({
            handleScroll: false,
            handleScale: false,
        });
        const price = this._series.coordinateToPrice(param.y - rect.top);
        if (price === null) {
            return;
        }
        this._addPoint({
            time: time,
            price
        });
    }

    private _onMouseUp(param: MouseEvent) {

        const rect = this._chart?.chartElement().getBoundingClientRect();
        if (!rect) return;
        const time = this._chart?.timeScale().coordinateToTime(param.x - rect.left);
        const point = {
            x: param.x - rect.left,
            y: param.y - rect.top,
        };

        this._chart?.applyOptions({
            handleScroll: true,
            handleScale: true,
        });

        if (!this._drawing || !point || !time || !this._series) return;


        const price = this._series.coordinateToPrice(param.y - rect.top);
        if (price === null) {
            return;
        }

        if (this._points.length === 0 || this._points[0].time === time) return;
        this._addPoint({
            time: time,
            price
        });
    }


    private _onMouseMove(param: MouseEventParams) {
        if (!this._drawing || !param.point || !param.time || !this._series) return;
        const price = this._series.coordinateToPrice(param.point.y);
        if (price === null) {
            return;
        }
        if (this._previewRectangle) {
            this._previewRectangle.updateEndPoint({
                time: param.time,
                price
            });
        }
    }

    private _addPoint(p: Point) {
        this._points.push(p);
        if (this._points.length >= 2) {
            this.addNewRectangle(this._points[0], this._points[1]);
            this.stopDrawing();
            this._onDrawingComplete();
            this._removePreviewRectangle();
        }
        if (this._points.length === 1) {
            this._addPreviewRectangle(this._points[0]);
        }
    }

    public addNewRectangle(p1: Point, p2: Point) {
        const rectangle = new Rectangle(p1, p2, { ...this._defaultOptions });
        this._rectangles.push(rectangle);
        ensureDefined(this._series).attachPrimitive(rectangle);
    }

    private _removeRectangle(rectangle: Rectangle) {
        ensureDefined(this._series).detachPrimitive(rectangle);
    }

    private _addPreviewRectangle(p: Point) {
        this._previewRectangle = new PreviewRectangle(p, p, {
            ...this._defaultOptions,
        });
        ensureDefined(this._series).attachPrimitive(this._previewRectangle);
    }

    private _removePreviewRectangle() {
        if (this._previewRectangle) {
            ensureDefined(this._series).detachPrimitive(this._previewRectangle);
            this._previewRectangle = undefined;
        }
    }

    // private _addToolbarButton() {
    // 	if (!this._drawingsToolbarContainer) return;
    // 	const button = document.createElement('div');
    // 	button.style.width = '20px';
    // 	button.style.height = '20px';
    // 	button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M315.4 15.5C309.7 5.9 299.2 0 288 0s-21.7 5.9-27.4 15.5l-96 160c-5.9 9.9-6.1 22.2-.4 32.2s16.3 16.2 27.8 16.2H384c11.5 0 22.2-6.2 27.8-16.2s5.5-22.3-.4-32.2l-96-160zM288 312V456c0 22.1 17.9 40 40 40H472c22.1 0 40-17.9 40-40V312c0-22.1-17.9-40-40-40H328c-22.1 0-40 17.9-40 40zM128 512a128 128 0 1 0 0-256 128 128 0 1 0 0 256z"/></svg>`;
    // 	button.addEventListener('click', () => {
    // 		if (this.isDrawing()) {
    // 			this.stopDrawing();
    // 		} else {
    // 			this.startDrawing();
    // 		}
    // 	});
    // 	this._drawingsToolbarContainer.appendChild(button);
    // 	this._toolbarButton = button;
    // 	const colorPicker = document.createElement('input');
    // 	colorPicker.type = 'color';
    // 	colorPicker.value = '#1976d2';
    // 	colorPicker.style.width = '24px';
    // 	colorPicker.style.height = '20px';
    // 	colorPicker.style.border = 'none';
    // 	colorPicker.style.padding = '0px';
    // 	colorPicker.style.backgroundColor = 'transparent';
    // 	colorPicker.addEventListener('change', () => {
    // 		const newColor = colorPicker.value;
    // 		this._defaultOptions.fillColor = newColor + 'CC';
    // 		this._defaultOptions.previewFillColor = newColor + '77';
    // 		this._defaultOptions.labelColor = newColor;
    // 	});
    // 	this._drawingsToolbarContainer.appendChild(colorPicker);
    // }
}




import NorthEastOutlinedIcon from '@mui/icons-material/NorthEastOutlined';
import { Box, IconButton, SvgIcon } from '@mui/material';
import { useState, useEffect, useRef, act } from 'react';
import { ToolsEnum, useToolContext } from './DrawingTool';

interface TrendLineButtonProps {
    chart: IChartApi;
    series: ISeriesApi<SeriesType>;
}
export default function TrendLineButton({ chart, series }: TrendLineButtonProps) {
    const [color, setColor] = useState('white');
    const { activedTool, setActivedTool } = useToolContext();
    const trendLineDrawingTool = useRef<null | TrendLineDrawingTool>(null)
    useEffect(() => {
        setColor(activedTool === 'trendLine' ? '#25509f' : 'white')
        if (activedTool !== 'trendLine'){
            if (trendLineDrawingTool.current === null) {
                return;
            }
            trendLineDrawingTool.current.stopDrawing()
        }

    }, [activedTool])

    // useEffect(() => {


    //     const drawingTool = new TrendLine(chart, series, () => {
    //         setActivedTool(null)
    //     })
    //     trendLineDrawingTool.current = drawingTool
    //     series.attachPrimitive(drawingTool)
    // }, [])

    useEffect(() => {
        if (chart === null || series === null) {
            return;
        }

        const onDrawingComplete = () => {
            setActivedTool(null)
        }

        const trend = new TrendLineDrawingTool(chart, series, onDrawingComplete, {});
        trendLineDrawingTool.current = trend;
    }, [chart, series])

    const handleClick = () => {

        if (trendLineDrawingTool.current === null) {
            return;
        }

        if (activedTool === 'trendLine') {
            setActivedTool(null)
            trendLineDrawingTool.current.stopDrawing()
        } else {
            setActivedTool('trendLine')
            trendLineDrawingTool.current.startDrawing()
        }
    }

    return (
        <Box>
            <IconButton onClick={handleClick} title='射线'>
                <SvgIcon htmlColor='white' >
                    <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10184" width="8" height="8"><path d="M541.824 536.448l-8.704 8.832M533.12 545.28L338.176 740.096a38.4 38.4 0 0 1-54.272 0 38.4 38.4 0 0 1 0-54.272l192.768-192.896M614.4 358.4L903.424 66.304a38.4 38.4 0 0 1 54.272 0 38.4 38.4 0 0 1 0 54.272L710.4 367.872" fill={color} p-id="10185"></path><path d="M214.4 972.8A156.8 156.8 0 1 1 371.2 816 157.056 157.056 0 0 1 214.4 972.8z m0-249.6A92.8 92.8 0 1 0 307.2 816a92.928 92.928 0 0 0-92.8-92.8zM572.8 601.6a155.648 155.648 0 0 1-65.92-14.464A156.928 156.928 0 1 1 572.8 601.6z m0-249.6a92.8 92.8 0 0 0-38.4 177.024 92.8 92.8 0 1 0 38.4-177.024z" fill={color} p-id="10186"></path></svg>
                </SvgIcon>
            </IconButton>
        </Box>
    );
}