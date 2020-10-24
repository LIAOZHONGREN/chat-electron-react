import { fabric } from 'fabric'
import { round } from 'lodash'

//对象缩放的方向
export type Dir = 'left-top' | 'core-top' | 'right-top' | 'right-core' | 'right-bottom' | 'core-bottom' | 'left-bottom' | 'left-core'
export type AreaInfo = { from: { x: number, y: number }, to: { x: number, y: number } }
export enum Darw { Arrow = "Arrow", Line = "Line", Dottedline = "Dottedline", Circle = "Circle", Ellipse = "Ellipse", Square = "Square", FreeDrawing = 'FreeDrawing', Mosaic = 'Mosaic', InputText = 'InputText' }

//绘制箭头方法
function drawArrow(fromX: number, fromY: number, toX: number, toY: number, theta?: number, headlen: number) {
    theta = typeof theta != "undefined" ? theta : 30;
    headlen = typeof theta != "undefined" ? headlen : 10;
    // 计算各角度和对应的P2,P3坐标
    let angle = Math.atan2(fromY - toY, fromX - toX) * 180 / Math.PI,
        angle1 = (angle + theta) * Math.PI / 180,
        angle2 = (angle - theta) * Math.PI / 180,
        topX = headlen * Math.cos(angle1),
        topY = headlen * Math.sin(angle1),
        botX = headlen * Math.cos(angle2),
        botY = headlen * Math.sin(angle2);
    let arrowX = fromX - topX,
        arrowY = fromY - topY
    let path = " M " + fromX + " " + fromY
    path += " L " + toX + " " + toY;
    arrowX = toX + topX;
    arrowY = toY + topY;
    path += " M " + arrowX + " " + arrowY
    path += " L " + toX + " " + toY
    arrowX = toX + botX
    arrowY = toY + botY
    path += " L " + arrowX + " " + arrowY
    return path
}

interface infoType {
    from?: { x: Number, y: number }
    to?: { x: Number, y: number }
    x?: Number
    y?: number
}
//控制给定的区域或移动坐标在给定区域以内
export function LimitedToDesignatedArea<T extends infoType>(info: T, areaInfo: AreaInfo): T {

    if (info.from !== undefined && info.to !== undefined) {
        const { from, to } = info
        const [w, h] = [to.x - from.x, to.y - from.y]
        if (from.x < areaInfo.from.x) { from.x = areaInfo.from.x; to.x = from.x + w }
        if (from.y < areaInfo.from.y) { from.y = areaInfo.from.y; to.y = from.y + h }
        if (to.x > areaInfo.to.x) { to.x = areaInfo.to.x; from.x = to.x - w }
        if (to.y > areaInfo.to.y) { to.y = areaInfo.to.y; from.y = to.y - h }
        return { from: from, to: to }
    } else {
        if (info.x === undefined || info.y === undefined) return
        let { x, y } = info
        if (x < areaInfo.from.x) { x = areaInfo.from.x }
        if (y < areaInfo.from.y) { y = areaInfo.from.y }
        if (x > areaInfo.to.x) { x = areaInfo.to.x }
        if (y > areaInfo.to.y) { y = areaInfo.to.y }
        return { x: x, y: y }
    }
}

export class CanvasHandle {

    public CanvasDatas: { json: string, canvasInfo: { x: number, y: number, w: number, h: number } }[] = []
    private subscribeCanvasDatas: (datas: string) => void
    private canvasX: number
    private canvasY: number
    private canvasW: number
    private canvasH: number
    public Canvas: fabric.Canvas
    private canvasObject: fabric.Object
    public BackgroundImage: fabric.Image
    private strokeColor: string = '#ff4d4f'
    private strokeWidth: number = '2'
    private fontSize = 18
    private draw: darw
    public MosaicGroup: fabric.Group
    private drawFuncs = new Map<Darw, (from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean) => void>([
        [Darw.Arrow, this.DrawArrow],
        [Darw.Line, this.DrawLine],
        [Darw.Dottedline, this.DrawDottedline],
        [Darw.Circle, this.DrawCircle],
        [Darw.Ellipse, this.DrawEllipse],
        [Darw.Square, this.DrawSquare]
    ])

    constructor(ele: HTMLCanvasElement, strokeConfig?: { color: string, width: string }) {
        this.Canvas = new fabric.Canvas(ele, {
            isDrawingMode: true,
            //  skipTargetFind: true,
            selectable: false,
            selection: false,
        })
        if (strokeConfig) {
            this.strokeColor = strokeConfig.color
            this.strokeWidth = strokeConfig.width
        }
        const bcr = ele.getBoundingClientRect()
        this.canvasX = bcr.x
        this.canvasY = bcr.y
        this.canvasW = bcr.width
        this.canvasH = bcr.height

        let [downX, downY, moveX, moveY] = [0, 0, 0, 0]
        let data: AreaInfo
        let isMove = false
        let activeObjectRect: { left: number, top: number, width: number, height: number }
        let oldtime = 0
        let isSelectedObject = false

        this.Canvas.on('mouse:down', e => {
            const ev: MouseEvent = e.e
            const dxy = this.Canvas.getPointer(ev)
            downX = ev.clientX
            downY = ev.clientY
            if (!this.xyIsInCanvas(downX, downY)) return

            if (this.Canvas.getActiveObject()) {
                isSelectedObject = true
                document.onmouseup = () => {
                    document.onmouseup = null
                    activeObjectRect = null
                    if (isMove) {
                        this.AddCanvasData()
                        isMove = false
                    }
                }
            } else {
                isSelectedObject = false
            }

            if (this.draw == Darw.FreeDrawing) {
                document.onmouseup = () => {
                    document.onmouseup = null
                    setTimeout(() => {
                        this.Canvas.getObjects().forEach(o => {
                            if (o.type === 'path' && !o.name) {
                                o.name = Darw.FreeDrawing
                                o.selectable = false
                            }
                        })
                        if (this.draw) {
                            this.AddCanvasData()
                        }
                    }, 100);
                }
                return
            }

            if (this.draw == Darw.Mosaic && !isSelectedObject) {
                document.onmousemove = ev => { this.DrawMosaic(this.toCanvaXY({ x: ev.clientX, y: ev.clientY }), 8) }
                document.onmouseup = () => {
                    document.onmousemove = document.onmouseup = null
                    setTimeout(() => {
                        if (this.draw) {
                            this.AddCanvasData()
                        }
                    }, 100);
                }
                return
            }

            if (this.draw == Darw.InputText) {
                const { x, y } = this.toCanvaXY({ x: downX, y: downY })
                if (!this.canvasObject) { this.DrawText({ x: x, y: y }) }
                let text = (this.canvasObject as fabric.Textbox)
                if (text.text.trim() !== '') {
                    text.exitEditing()
                    this.AddCanvasData()
                    text = this.DrawText({ x: x, y: y })
                }
                text.exitEditing()
                text.left = x
                text.top = y
                text.enterEditing()
                return
            }

            if (!isSelectedObject) {
                document.onmousemove = ev => {

                    if (Date.now() - oldtime < 10) return
                    oldtime = Date.now()

                    moveX = ev.clientX
                    moveY = ev.clientY
                    if (this.draw == Darw.Arrow) {
                        data = { from: { x: downX, y: downY }, to: { x: moveX, y: moveY } }
                    } else {
                        data = this.limitThePointToTheLT({ x: downX, y: downY }, { x: moveX, y: moveY })
                    }
                    data = { from: this.toCanvaXY(data.from), to: this.toCanvaXY(data.to) }
                    const { from, to } = data
                    to.x -= this.strokeWidth
                    to.y -= this.strokeWidth
                    if (this.draw) this.drawFuncs.get(this.draw).bind(this)(from, to, false)
                }

                document.onmouseup = () => {
                    document.onmousemove = document.onmouseup = null
                    if (this.draw && data) {
                        this.drawFuncs.get(this.draw).bind(this)(data.from, data.to)
                        this.AddCanvasData()
                    }
                    data = null
                }
            }
        })

        let text: string
        let textBox: fabric.Textbox
        this.Canvas.on('selection:created', e => {

            if ('text' in e.target) {
                textBox = e.target
                text = textBox.text
            }
        })

        this.Canvas.on('selection:updated', e => {
            if (textBox) {
                if (textBox.text.trim() === '') { this.Canvas.remove(textBox) }
                else if (textBox.text !== text) {
                    this.AddCanvasData()
                }
                textBox = null
                text = null
            }
            if ('text' in e.target) {
                textBox = e.target
                text = textBox.text
            }
        })

        this.Canvas.on('selection:cleared', e => {

            if (textBox) {
                if (textBox.text.trim() === '') { this.Canvas.remove(textBox) }
                else if (textBox.text !== text) {
                    this.AddCanvasData()
                }
                textBox = null
                text = null
            }
        })

        this.Canvas.on('object:moving', e => {
            isMove = true//用于松开鼠标后判断是否移动过画布对象保存更改后的画布数据
            const ev: MouseEvent = e.e
            const activeObj = e.target
            if ('text' in activeObj) return
            if (!activeObjectRect) { activeObjectRect = activeObj.getBoundingRect() }
            moveX = ev.clientX
            moveY = ev.clientY
            let { left, top, width, height } = activeObjectRect
            left = left + moveX - downX
            top = top + moveY - downY
            const value = LimitedToDesignatedArea({ from: { x: left, y: top }, to: { x: left + width, y: top + height } }, { from: { x: 0, y: 0 }, to: { x: this.canvasW, y: this.canvasH } })
            activeObj.left = value.from.x
            activeObj.top = value.from.y
        })

        this.Canvas.on('object:scaling', e => {

            const activeObj = e.target
            const scales = this.getObjectMaxScaling(e)
            if (activeObj.scaleX >= scales[0]) {
                activeObj.lockScalingX = true
                activeObj.scaleX = scales[0]
                activeObj.lockScalingX = false
            }
            if (activeObj.scaleY >= scales[1]) {
                activeObj.lockScalingY = true
                activeObj.scaleY = scales[1]
                activeObj.lockScalingY = false
            }
            isMove = true
        })


        this.AddCanvasData.bind(this)
        this.SetInputTextFontSize.bind(this)
        this.SetCanvasWH.bind(this)
        this.SetCanvasOffset.bind(this)
        this.RestoreCanvasOffset.bind(this)
        this.SubscribeCanvasDatas.bind(this)
        this.SetStroke.bind(this)
        this.GetMinPackageBorder.bind(this)
        this.GoBackOperate.bind(this)
        this.SetDraw.bind(this)
        this.DrawArrow.bind(this)
        this.DrawLine.bind(this)
        this.DrawDottedline.bind(this)
        this.DrawCircle.bind(this)
        this.DrawEllipse.bind(this)
        this.DrawSquare.bind(this)
        this.DrawMosaic.bind(this)
        this.DrawImage.bind(this)
        this.DrawBackgroundImage.bind(this)
        this.ClearBackgroundImage.bind(this)
        this.DrawText.bind(this)
        this.Destroy.bind(this)
        this.GetObjectsMinPackageBorder.bind(this)
    }

    //把areaInfo的from限制在左上角
    private limitThePointToTheLT(from: { x: number, y: number }, to: { x: number, y: number }): AreaInfo {
        const [a, b] = [from.x - to.x, from.y - to.y]
        const [w, h] = [Math.abs(a), Math.abs(b)]
        if (a > 0 && b > 0) return { from: to, to: from }
        if (a < 0 && b > 0) return { from: { x: from.x, y: from.y - h }, to: { x: to.x, y: to.y + h } }
        if (a < 0 && b < 0) return { from: from, to: to }
        if (a > 0 && b < 0) return { from: { x: from.x - w, y: from.y }, to: { x: to.x + w, y: to.y } }
        return { from: from, to: to }
    }

    //把屏幕坐标转换为画布坐标
    private toCanvaXY(xy: { x: number, y: number }): { x: number, y: number } {
        let { x, y } = xy
        if (x < this.canvasX) x = this.canvasX
        else if (x > this.canvasX + this.canvasW) x = this.canvasX + this.canvasW
        if (y < this.canvasY) y = this.canvasY
        else if (y > this.canvasY + this.canvasH) y = this.canvasY + this.canvasH
        return { x: x - this.canvasX, y: y - this.canvasY }
    }
    //判断坐标是否在画布中
    private xyIsInCanvas(x: number, y: number): boolean {
        let ok = true
        if (x < this.canvasX) ok = false
        else if (x > this.canvasX + this.canvasW) ok = false
        return ok
    }

    //获取对象缩放最大缩放率
    private getObjectMaxScaling(ev: fabric.IEvent): Array<numbwe> {

        const { scaleX, scaleY } = ev.target.getObjectScaling()//获取对象的缩放率
        const [startW, startH] = [ev.target.width + this.strokeWidth, ev.target.height + this.strokeWidth]//对象创建时的宽高
        const { corner, originX, originY } = ev.transform
        const [lt, rt, rb, lb] = ev.target.getCoords()

        if (corner === 'mr' || corner === 'ml') {
            return originX === 'left' ? [(this.canvasW - lt.x) / startW, scaleY] : [rt.x / startW, scaleY]
        }

        if (corner === 'mt' || corner === 'mb') {
            return originY === 'bottom' ? [scaleX, lb.y / startH] : [scaleX, (this.canvasH - lt.y) / startH]
        }

        const temp = originX[0] + originY[0]
        //相反(rb 对应控制的时左上角)
        if (temp === 'rb') return [rb.x / startW, rb.y / startH]
        if (temp === 'lt') return [(this.canvasW - lt.x) / startW, (this.canvasH - lt.y) / startH]
        if (temp === 'rt') return [rt.x / startW, (this.canvasH - rt.y) / startH]
        if (temp === 'lb') return [(this.canvasW - lb.x) / startW, lb.y / startH]
    }

    //增加新操作后,添加一个新的画布数据,用于返回上一步操作
    public AddCanvasData() {
        this.CanvasDatas.push({ json: this.Canvas.toJSON(['name', 'selectable', 'hasControls']), canvasInfo: { x: this.canvasX, y: this.canvasY, w: this.canvasW, h: this.canvasH } })
        this.subscribeCanvasDatas(this.CanvasDatas)
    }

    //个别Draw方法的执行方法(为了把公共逻辑放到此方法)
    private exec(object: fabric.Object, isOk?: boolean = true) {
        if (this.canvasObject) this.Canvas.remove(this.canvasObject)
        this.canvasObject = object
        this.Canvas.add(this.canvasObject)
        if (isOk) this.canvasObject = null
    }

    //设置输入文字的字体大小
    public SetInputTextFontSize(size: number) {
        this.fontSize = size
    }

    //调整画布的宽高
    public SetCanvasWH(w: number, h: number) {
        this.Canvas.setWidth(w)
        this.Canvas.setHeight(h)
        const bcr = this.Canvas.getElement().getBoundingClientRect()
        this.canvasX = bcr.x
        this.canvasY = bcr.y
        this.canvasW = bcr.width
        this.canvasH = bcr.height
    }

    //用于改名画布大小影响到画布的位置坐标的时候保持画布里的对象相对窗口位置不变(结束后必须调用RestoreCanvasOffset方法还原)
    public SetCanvasOffset(offsetX: number, offsetY: number) {
        if (offsetX === 0 && offsetY === 0) return
        this.Canvas.relativePan(new fabric.Point(offsetX, offsetY))
        // this.Canvas.getObjects().forEach(o => {
        //     o.left += offsetX
        //     o.top += offsetY
        //     o.setCoords()
        // })
    }


    public RestoreCanvasOffset() {
        const { tl } = this.Canvas.calcViewportBoundaries()
        this.Canvas.relativePan(new fabric.Point(tl.x, tl.y))
        this.Canvas.getObjects().forEach(o => {
            o.left -= tl.x
            o.top -= tl.y
            o.setCoords()
        })
    }


    public SubscribeCanvasDatas(func: (datas: string[]) => void) {
        this.subscribeCanvasDatas = func
    }

    //设置笔触大小和颜色
    public SetStroke(stroke: { color: string, width: string }) {
        this.Canvas.freeDrawingBrush.color = this.strokeColor = stroke.color
        this.Canvas.freeDrawingBrush.width = this.strokeWidth = stroke.width
    }

    //返回最小刚好包裹画布中所有对象的矩形边框相对于画布的起始坐标和结束坐标,如果画布中不存在对象返回null
    public GetMinPackageBorder(object?: fabric.Canvas | fabric.Group): AreaInfo | null {
        if (!object) object = this.Canvas
        const [w, h] = [object.width, object.height]
        const { from, to } = { from: { x: w, y: h }, to: { x: 0, y: 0 } }
        const objects = object.getObjects()
        if (!objects || objects.length === 0) return null
        for (const obj of objects) {
            if (obj.name === undefined || obj.name == Darw.InputText) continue
            const coords: fabric.Point[] = obj.getCoords()
            from.x = coords[0].x <= from.x ? coords[0].x : from.x
            from.y = coords[0].y <= from.y ? coords[0].y : from.y
            to.x = coords[2].x >= to.x ? coords[2].x : to.x
            to.y = coords[2].y >= to.y ? coords[2].y : to.y
        }
        return { from: from, to: to }
    }

    //返回最小刚好包裹所有对象的矩形边框相对于画布的起始坐标和结束坐标,如果画布中不存在对象返回null
    public GetObjectsMinPackageBorder(objects: fabric.Object): AreaInfo | null {
        const [w, h] = [this.Canvas.width, this.Canvas.height]
        const { from, to } = { from: { x: w, y: h }, to: { x: 0, y: 0 } }
        if (!objects || objects.length === 0) return null
        for (const obj of objects) {
            if (obj.name === undefined || obj.name == Darw.InputText) continue
            const coords: fabric.Point[] = obj.getCoords()
            from.x = coords[0].x <= from.x ? coords[0].x : from.x
            from.y = coords[0].y <= from.y ? coords[0].y : from.y
            to.x = coords[2].x >= to.x ? coords[2].x : to.x
            to.y = coords[2].y >= to.y ? coords[2].y : to.y
        }
        return { from: from, to: to }
    }

    //返回上一步操作,adjust:画布的areaInfo将发生改变的通知函数(因为每次操作都可能调整了画布的大小,
    //所以上一次的操作的画布大小可能与当前的画布不一致,如果前台需要用到画布的areaInfo可以提供此回调函数)
    public GoBackOperate(adjust?: (ai: AreaInfo) => void) {
        this.Canvas.clear()
        this.CanvasDatas.pop()//抛弃最新那个画布数据(因为当前的画布画的就是这个数据)
        if (this.Canvas.isEmpty || this.CanvasDatas.length !== 0) { this.subscribeCanvasDatas(this.CanvasDatas) }
        if (this.CanvasDatas.length === 0) return
        const { json, canvasInfo } = this.CanvasDatas[this.CanvasDatas.length - 1]
        if (adjust) adjust({ from: { x: canvasInfo.x, y: canvasInfo.y }, to: { x: canvasInfo.x + canvasInfo.w, y: canvasInfo.y + canvasInfo.h } })
        this.SetCanvasWH(canvasInfo.w, canvasInfo.h)
        this.Canvas.loadFromJSON(json, this.Canvas.renderAll.bind(this.Canvas), (o, object) => {
            // if (!('text' in object)) object.hasControls = false
            if (!('text' in object)) object.setControlsVisibility({ mtr: false })
        })
    }

    //设置画什么
    public SetDraw(type: Darw) {
        if (this.draw == Darw.InputText && this.canvasObject) {
            const text = (this.canvasObject as fabric.Textbox)
            text.exitEditing()
            if (text.text.trim() === '') { this.Canvas.remove(text) }
            else {
                this.AddCanvasData()
            }
            this.canvasObject = null
        }
        if (type == Darw.FreeDrawing) this.Canvas.isDrawingMode = true
        else this.Canvas.isDrawingMode = false

        if (this.draw == Darw.Mosaic) {
            this.Canvas.skipTargetFind = false
        }
        if (type == Darw.Mosaic) {
            this.Canvas.skipTargetFind = true
        }
        this.draw = type
    }

    //画箭头
    public DrawArrow(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const obj = new fabric.Path(drawArrow(from.x, from.y, to.x, to.y, 30, 30), { stroke: this.strokeColor, fill: "rgba(255,255,255,0)", strokeWidth: 2, name: Darw.Arrow })
        obj.setControlsVisibility({ bl: false, br: false, mb: false, ml: false, mr: false, mt: false, tl: false, tr: false, mtr: false })
        this.exec(obj, isOk)
    }

    //画直线
    public DrawLine(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const obj = new fabric.Line([from.x, from.y, to.x, to.y], { stroke: this.strokeColor, strokeWidth: this.strokeWidth, })
        obj.setControlsVisibility({ bl: false, br: false, mb: false, ml: false, mr: false, mt: false, tl: false, tr: false, mtr: false })
        this.exec(obj, isOk)
    }

    //画虚线
    public DrawDottedline(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const obj = new fabric.Line([from.x, from.y, to.x, to.y], { strokeDashArray: [3, 1], stroke: this.strokeColor, strokeWidth: this.strokeWidth })
        obj.setControlsVisibility({ bl: false, br: false, mb: false, ml: false, mr: false, mt: false, tl: false, tr: false, mtr: false })
        this.exec(obj, isOk)
    }

    //画圆(非实心)
    public DrawCircle(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const [left, top] = [from.x, from.y]
        const radius = Math.sqrt((to.x - left) * (to.x - left) + (to.y - top) * (to.y - top)) / 2;
        const obj = canvasObject = new fabric.Circle({ left: left, top: top, fill: "rgba(255, 255, 255, 0)", radius: radius, stroke: this.strokeColor, strokeWidth: this.strokeWidth });
        obj.setControlsVisibility({ bl: false, br: false, mb: false, ml: false, mr: false, mt: false, tl: false, tr: false, mtr: false })
        this.exec(obj, isOk)
    }

    //画椭圆(非实心)
    public DrawEllipse(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const [left, top] = [from.x, from.y]
        const obj = new fabric.Ellipse({ left: left, top: top, fill: "rgba(255, 255, 255, 0)", rx: Math.abs(left - to.x) / 2, ry: Math.abs(top - to.y) / 2, stroke: this.strokeColor, strokeWidth: this.strokeWidth, name: Darw.Ellipse })
        obj.setControlsVisibility({ mtr: false })
        this.exec(obj, isOk)
    }

    //画矩形(非实心)
    public DrawSquare(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const path = `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y} L ${from.x} ${to.y} L ${from.x} ${from.y} z`
        const obj = new fabric.Path(path, { left: from.x, top: from.y, fill: "rgba(255, 255, 255, 0)", stroke: this.strokeColor, strokeWidth: this.strokeWidth, name: Darw.Square })
        // obj.setControlVisible('mtr', false)
        obj.setControlsVisibility({ mtr: false })
        this.exec(obj, isOk)
    }

    //画马赛克
    public DrawMosaic(core: { x: number, y: number }, mosaicSize: number) {

        const [x, y, w, h] = [core.x - mosaicSize / 2, core.y - mosaicSize / 2, mosaicSize, mosaicSize]
        const imageData = this.Canvas.getContext().getImageData(x, y, w, h)
        const len = imageData.data.length / 4
        const rgba = [0, 0, 0, 0]
        for (let i = 0; i < len; i++) {
            const h = i * 4
            rgba[0] += imageData.data[h]
            rgba[1] += imageData.data[h + 1]
            rgba[2] += imageData.data[h + 2]
            rgba[3] += imageData.data[h + 3]
        }
        const obj = new fabric.Rect({
            fill: `rgb(${parseInt(rgba[0] / len)},${parseInt(rgba[1] / len)},${parseInt(rgba[2] / len)})`,
            left: x,
            top: y,
            width: w,
            height: h,
            selectable: false,
            name: Darw.Mosaic
        })
        this.Canvas.add(obj)

    }

    //visible:适应画布使图片整体可见(设置此属性后w,h,sw,sh将无效)
    //w,h:从0点开始获取图片给定的宽高的的图像
    //sw,sh:设置获得图图像的宽和高,默认为图像宽高
    public DrawImage(img: HTMLImageElement | string, o?: { x?: number, y?: number, w?: number, h?: number, sw?: number, sh?: number, visible?: boolean }) {

        const x = o?.x ? o.x : 0
        const y = o?.y ? o.y : 0
        let w = o?.w > 0 ? o.w : 0
        let h = o?.h > 0 ? o.h : 0
        let sw = o?.sw > 0 ? o.sw : 0
        let sh = o?.sh > 0 ? o.sh : 0
        const v = o?.visible ? o?.visible : false

        let short: number
        if (v) {
            if (x < 0 || x > this.canvasW || y < 0 || y > this.canvasH) throw new Error("设置了visible为true后(适应画布使图片整体可见),起始坐标必须在画布内!")
            const [w_, h_] = [this.canvasW - x, this.canvasH - y]
            short = w_ <= h_ ? w_ : h_
        }

        function execDraw() {
            let width: number, height: number
            if (v) {
                const isW = img_.width > img_.height
                w = img_.width
                h = img_.height
                if (isW) {
                    sw = short
                    sh = (short / img_.width) * img_.height
                } else {
                    sw = (short / img_.height) * img_.width
                    sh = short
                }
            } else {
                w = w ? w : img_.width
                h = h ? h : img_.height
            }

            // fabric.Image.fromURL(dataUrl, (oImg) => {
            //     if (sw > 0) oImg.scaleToWidth(sw, false)
            //     if (sh > 0) oImg.scaleToHeight(sh, false)
            //     this.canvas.add(oImg)
            // }, { left: x, top: y, width: w, height: h })

            const obj = new fabric.Image(img_, { left: x, top: y, width: w, height: h })
            if (sw > 0) obj.scaleToWidth(sw, false)
            if (sh > 0) obj.scaleToHeight(sh, false)
            this.Canvas.add(obj)

        }

        let img_: Image
        if (typeof img === 'string') {
            img_ = new Image()
            img_.onload = () => {
                execDraw.bind(this)()
            }
            img_.src = img
        } else {
            img_ = img
            execDraw.bind(this)()
        }
    }

    public DrawBackgroundImage(img: HTMLImageElement, sw?: number, sh?: number, callback?: () => void) {
        if (this.BackgroundImage) this.Canvas.remove(this.BackgroundImage)
        this.BackgroundImage = new fabric.Image(img, { left: 0, top: 0, width: img.width, height: img.height })
        if (sw > 0) this.BackgroundImage.scaleToWidth(sw, false)
        if (sh > 0) this.BackgroundImage.scaleToHeight(sh, false)
        this.Canvas.setBackgroundImage(this.BackgroundImage, () => {
            this.Canvas.renderAll.bind(this.Canvas)
            setTimeout(() => {
                if (callback) callback()
            }, 100)
        }, { originX: 'left', originY: 'top' })
    }

    //清除画布的背景图片
    public ClearBackgroundImage() {
        if (this.BackgroundImage) {
            this.Canvas.remove(this.BackgroundImage)
            this.BackgroundImage = null
        }
    }

    //添加输入框
    public DrawText(pos: { x: number, y: number }): fabric.Textbox {
        const textbox = new fabric.Textbox('', {
            left: pos.x,
            top: pos.y,
            width: 20,
            fontSize: this.fontSize,
            borderColor: this.strokeColor,
            fill: this.strokeColor,
            name: Darw.InputText
        });

        this.Canvas.add(textbox)
        textbox.enterEditing()
        return this.canvasObject = textbox

    }

    //销毁
    public Destroy() {
        this.Canvas.dispose()
    }

}