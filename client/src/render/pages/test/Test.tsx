import React, { useRef, useEffect, useState, useMemo } from 'react';
import { MyRadio } from '../../components/components'
import { fabric } from 'fabric'
import mtils from 'mtils'
import './test.scss'
import { CreateObjectURL, DeepCopy, IsJSONEqual } from '../../common/tools';
import { readFileSync, writeFileSync } from 'fs'
import { ThunderboltFilled } from '@ant-design/icons';
import { clipboard, nativeImage, remote } from 'electron'
import path from 'path'
import os from 'os'
import { Screenshot } from '../../common/dllFunc'



export interface ITestProps {
}

//缩放方向
type dir = 'left-top' | 'core-top' | 'right-top' | 'right-core' | 'right-bottom' | 'core-bottom' | 'left-bottom' | 'left-core'
type areaInfo = { from: { x: number, y: number }, to: { x: number, y: number } }
type operateType = 'draw-square' | 'draw-ellipse' | ''
type operate = { id: string, type: operateType, brushStrokesConfig?: { color: string, size: number }, data: any }
const brushStrokesColors = ['#ff4d4f', '#ffc53d', '#40a9ff', '#73d13d', '#595959', '#ffffff']//笔触颜色
const brushStrokesWidths = [2, 4, 6]//笔触大小
let middleCanvas: CanvasHandle

export default function Test(props: ITestProps) {

    const middleRoot = useRef<HTMLDivElement>()
    const main = useRef<HTMLCanvasElement>()
    const mask = useRef<HTMLCanvasElement>()
    const frame = useRef<HTMLCanvasElement>()
    const middle = useRef<HTMLCanvasElement>()
    const [areaInfo, setareaInfo] = useState<areaInfo | null>(null)
    const [brushStrokesConfig, setbrushStrokesConfig] = useState<{ color: string, width: number }>({ color: brushStrokesColors[0], width: brushStrokesWidths[0] })
    const [currentDraw, setcurrentDraw] = useState<darw | null>(null)
    const [isMoveFrame, setisMoveFrame] = useState(false)
    const [canvasDatasIsNull, setcanvasDatasIsNull] = useState(true)//记录用于返回上一步的画布数据是否为空(如果为空,且没操作,那么可以移动或取消截图选区)
    const [inputTextFontSize, setinputTextFontSize] = useState('中')
    //是否可以移动或取消截图选区
    const isCan = useMemo(() => {
        const can = currentDraw === null && canvasDatasIsNull === true
        if (can && middleCanvas) {
            middleCanvas.Destroy()
            middleCanvas = null
        }
        return can
    }, [currentDraw, canvasDatasIsNull])

    //画蒙布
    function fillMask() {
        const ctx = mask.current.getContext('2d')
        const [w, h] = [mask.current.width, mask.current.height]
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.fillRect(0, 0, w, h)
    }
    //画方块
    function drawSquare(ctx: CanvasRenderingContext2D, config: { color: string, size: number }, data: areaInfo) {
        const { from, to } = data
        ctx.beginPath()
        ctx.lineWidth = config.size
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.lineTo(from.x, to.y)
        ctx.lineTo(from.x, from.y)
        ctx.strokeStyle = config.color
        ctx.stroke()
    }

    //判断鼠标是否在选择区域内(只有鼠标在选中区域内才可以移动区域(编辑后不可移动))
    function isInTheSelectedArea(x: number, y: number): boolean {
        if (!areaInfo) return false
        const { from, to } = areaInfo
        return x >= from.x && to.x >= x && y >= from.y && to.y >= y
    }

    //画选择区域的边框
    function fileFrame(areaInfo: areaInfo) {
        const ctx = frame.current.getContext('2d')
        ctx.clearRect(0, 0, frame.current.width, frame.current.height)
        drawSquare(ctx, { color: '#a0d911', size: 0.5 }, areaInfo)
    }

    //剪切掉选择区域的蒙布
    function shearMask(areaInfo: areaInfo) {
        const { from, to } = areaInfo
        const ctx = mask.current.getContext('2d')
        fillMask()
        const [w, h] = [to.x - from.x, to.y - from.y]
        ctx.clearRect(from.x, from.y, w, h)
    }

    //选择截图区域或移动截图区域的事件函数
    function startFillFrame(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const [startX, startY] = [ev.clientX, ev.clientY]
        if (areaInfo && !isInTheSelectedArea(startX, startY)) return
        setisMoveFrame(true)
        let areaInfo_: areaInfo
        document.onmousemove = (e) => {
            const [incrementX, incrementY] = [e.clientX - startX, e.clientY - startY]
            if (areaInfo) {
                const { from, to } = areaInfo
                areaInfo_ = { from: { x: from.x + incrementX, y: from.y + incrementY }, to: { x: to.x + incrementX, y: to.y + incrementY } }
                areaInfo_ = limitedToDesignatedArea(areaInfo_, { from: { x: 0, y: 0 }, to: { x: document.body.clientWidth, y: document.body.clientHeight } })
            } else {
                const { x, y } = areaInfo_ = limitedToDesignatedArea({ x: e.clientX, y: e.clientY }, { from: { x: 0, y: 0 }, to: { x: document.body.clientWidth, y: document.body.clientHeight } })
                areaInfo_ = incrementX > 0 ? { from: { x: startX, y: startY }, to: { x: x, y: y } } : { from: { x: x, y: y }, to: { x: startX, y: startY } }
            }

            fileFrame(areaInfo_)
            shearMask(areaInfo_)
            middleRoot.current.style.left = `${areaInfo_.from.x}px`
            middleRoot.current.style.top = `${areaInfo_.from.y}px`
        }
        document.onmouseup = () => {
            setisMoveFrame(false)
            if (areaInfo_) setareaInfo(areaInfo_)
            document.onmouseup = document.onmousemove = null
        }
    }

    //调整截图选区的大小
    function adjustFrameSize(ev: React.MouseEvent<HTMLDivElement, MouseEvent>, dir: dir) {
        ev.stopPropagation()
        const { from, to } = DeepCopy(areaInfo)
        const [startX, startY] = [ev.clientX, ev.clientY]
        let newAreaInfo: areaInfo = DeepCopy(areaInfo)
        let minConstraint: areaInfo = { from: to, to: from }//调整大小的最小约束
        let [offsetX, offsetY] = [0, 0]//画布的坐标发生的偏移量

        if (middleCanvas) {
            const temp = middleCanvas.GetMinPackageBorder()
            if (temp) {
                const [from_, to_] = [{ x: temp.from.x + from.x, y: temp.from.y + from.y }, { x: temp.to.x + from.x, y: temp.to.y + from.y }]
                minConstraint = { from: from_, to: to_ }
            }
        }

        const [minFrom, minTo] = [minConstraint.from, minConstraint.to]
        document.onmousemove = e => {
            const [incX, incY] = [e.clientX - startX, e.clientY - startY]
            const [fx, fy] = [newAreaInfo.from.x, newAreaInfo.from.y]
            if (dir === 'left-top') {
                const [x, y] = [from.x + incX, from.y + incY]
                newAreaInfo = { from: { x: x >= minFrom.x ? minFrom.x : (x <= 0 ? 0 : x), y: y >= minFrom.y ? minFrom.y : (y <= 0 ? 0 : y) }, to: to }
            }
            else if (dir === 'core-top') {
                const y = from.y + incY
                newAreaInfo = { from: { x: from.x, y: y >= minFrom.y ? minFrom.y : (y <= 0 ? 0 : y) }, to: to }
            }
            else if (dir === 'right-top') {
                const [x, y] = [to.x + incX, from.y + incY]
                newAreaInfo = { from: { x: from.x, y: y >= minFrom.y ? minFrom.y : (y <= 0 ? 0 : y) }, to: { x: x >= document.body.clientWidth ? document.body.clientWidth : (x <= minTo.x ? minTo.x : x), y: to.y } }
            }
            else if (dir === 'right-core') {
                const x = to.x + incX
                newAreaInfo = { from: from, to: { x: x >= document.body.clientWidth ? document.body.clientWidth : (x <= minTo.x ? minTo.x : x), y: to.y } }
            }
            else if (dir === 'right-bottom') {
                const [x, y] = [to.x + incX, to.y + incY]
                newAreaInfo = { from: from, to: { x: x >= document.body.clientWidth ? document.body.clientWidth : (x <= minTo.x ? minTo.x : x), y: y >= document.body.clientWidth ? document.body.clientWidth : (y <= minTo.y ? minTo.y : y) } }
            }
            else if (dir === 'core-bottom') {
                const y = to.y + incY
                newAreaInfo = { from: from, to: { x: to.x, y: y >= document.body.clientWidth ? document.body.clientWidth : (y <= minTo.y ? minTo.y : y) } }
            }
            else if (dir === 'left-bottom') {
                const [x, y] = [from.x + incX, to.y + incY]
                newAreaInfo = { from: { x: x >= minFrom.x ? minFrom.x : (x <= 0 ? 0 : x), y: from.y }, to: { x: to.x, y: y >= document.body.clientHeight ? document.body.clientHeight : (y <= minTo.y ? minTo.y : y) } }
            }
            else if (dir === 'left-core') {
                const x = from.x + incX
                newAreaInfo = { from: { x: x >= minFrom.x ? minFrom.x : (x <= 0 ? 0 : x), y: from.y }, to: to }
            }
            fileFrame(newAreaInfo)
            shearMask(newAreaInfo)
            const [from2, to2] = [newAreaInfo.from, newAreaInfo.to]
            const [w, h] = [to2.x - from2.x, to2.y - from2.y]
            middleRoot.current.style.left = `${from2.x}px`
            middleRoot.current.style.top = `${from2.y}px`
            middleRoot.current.style.width = `${w}px`
            middleRoot.current.style.height = `${h}px`
            if (middleCanvas) {
                offsetX = fx - newAreaInfo.from.x
                offsetY = fy - newAreaInfo.from.y
                const [from2, to2] = [newAreaInfo.from, newAreaInfo.to]
                middleCanvas.SetCanvasWH(to2.x - from2.x, to2.y - from2.y)
                middleCanvas.SetCanvasOffset(offsetX, offsetY)
            }
        }

        document.onmouseup = () => {
            document.onmousemove = document.onmouseup = null
            if (newAreaInfo) {
                setareaInfo(newAreaInfo)
            }
        }
    }

    //右击取消选择的截图区域
    function deselectArea() {
        if (!canvasDatasIsNull) return
        setcurrentDraw(null)
        const ctx = frame.current.getContext('2d')
        ctx.clearRect(0, 0, frame.current.width, frame.current.height)
        fillMask()
        if (middleCanvas) {
            middleCanvas.Destroy()
            middleCanvas = null
        }
        setareaInfo(null)
    }

    function goBackOperate() {
        if (middleCanvas) {
            middleCanvas.GoBackOperate(areaInfo => {
                fileFrame(areaInfo)
                shearMask(areaInfo)
                setareaInfo(areaInfo)
            })
        }
    }

    function saveAs() {
        if (middleCanvas) {
            const img = nativeImage.createFromDataURL(middleCanvas.Canvas.toDataURL({ format: 'png', enableRetinaScaling: true }))
            const fileName = `${Date.now()}.png`
            remote.dialog.showSaveDialog(remote.getCurrentWindow(), { title: '另存为', defaultPath: path.join(os.homedir(), 'Desktop', fileName) }).then(v => {
                writeFileSync(v.filePath, new Uint8Array(img.toPNG()))
            }).catch(() => {

            })
        }
    }

    function screenshot() {
        if (middleCanvas) {
            clipboard.writeImage(nativeImage.createFromDataURL(middleCanvas.Canvas.toDataURL({ format: 'png', enableRetinaScaling: true })))
        }
    }

    const middleStyle = useMemo<React.CSSProperties>(() => {
        if (!areaInfo) return { width: 0, height: 0, top: 0, left: 0 }
        const { from, to } = areaInfo
        const [w, h] = [to.x - from.x, to.y - from.y]
        return { width: `${w}px`, height: `${h}px`, top: `${from.y}px`, left: `${from.x}px`, visibility: 'visible' }
    }, [areaInfo])

    const middleCanvasStyle = useMemo<React.CSSProperties>(() => areaInfo ? { position: 'relative', width: '100%', height: '100%' } : { visibility: 'hidden' }, [areaInfo])

    const toolbarClass = useMemo(() => {
        if (!areaInfo) return 'screenshot-toolbar bottom right '
        let class_ = 'screenshot-toolbar'
        const exceed = (areaInfo.to.x - areaInfo.from.x) >= 330 ? 0 : 330 - (areaInfo.to.x - areaInfo.from.x)//工具栏超出截图区的宽度
        class_ += ((areaInfo.to.y + 70) > document.body.clientHeight ? ' top' : ' bottom')
        if ((areaInfo.from.y - 70 <= 0) && (areaInfo.to.y + 70 > document.body.clientHeight)) class_ = 'screenshot-toolbar inside'
        class_ += exceed === 0 ? ' right' : (areaInfo.from.x >= exceed ? ' right' : ' left')
        return class_
    }, [areaInfo])

    useEffect(() => {
        if (areaInfo && !middleCanvas) {
            const { from, to } = areaInfo
            middle.current.width = to.x - from.x
            middle.current.height = to.y - from.y
        }
    }, [areaInfo, currentDraw])

    useEffect(() => {
        if (currentDraw && !middleCanvas && middle) {
            middleCanvas = new CanvasHandle(middle.current, brushStrokesConfig)
            middleCanvas.SubscribeCanvasDatas(ds => { setcanvasDatasIsNull(ds.length === 0 ? true : false) })
        }
        if (middleCanvas) {
            middleCanvas.SetDraw(currentDraw)
            middleCanvas.SetStroke(brushStrokesConfig)
        }
    }, [currentDraw, brushStrokesConfig])

    useEffect(() => {
        if (mask) { fillMask() }
    }, [])

    return (
        <div className='screenshot' style={!areaInfo ? { cursor: 'crosshair' } : null} onMouseDown={isCan ? startFillFrame : null} onContextMenu={deselectArea}>
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-main' ref={main} />
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-mask' ref={mask} />
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-frame' ref={frame} />
            <div className='screenshot-middle' style={middleStyle} ref={middleRoot}>
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                    <canvas style={middleCanvasStyle} ref={middle} />
                </div>
                <div className={toolbarClass} style={areaInfo && !isMoveFrame ? { display: 'inline-flex' } : null}>
                    <div className='toolbar-item' onClick={() => {
                        Screenshot().then(v => {
                            const ctx = main.current.getContext('2d')
                            ctx.drawImage(v, 0, 0, v.width, v.height)
                        })
                    }}><i className='toolbar-item-active fa fa-image' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == darw.Square ? null : darw.Square) }}><i className='toolbar-item-active fa fa-square-o' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == darw.Ellipse ? null : darw.Ellipse) }}><i className='toolbar-item-active fa fa-circle-thin' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == darw.Arrow ? null : darw.Arrow) }}><i className='toolbar-item-active fa fa-long-arrow-right' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == darw.FreeDrawing ? null : darw.FreeDrawing) }}><i className='toolbar-item-active fa fa-paint-brush' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == darw.Mosaic ? null : darw.Mosaic) }}><img className='toolbar-item-active' width={18} src={require('../../static/img/马赛克.png').default} /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == darw.InputText ? null : darw.InputText) }}><img className='toolbar-item-active' width={18} src={require('../../static/img/text.png').default} /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={goBackOperate} ><i className='toolbar-item-active fa fa-mail-reply' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={saveAs}><i className='toolbar-item-active fa fa-download' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} style={{ color: 'red' }}><i className='toolbar-item-active fa fa-close' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={screenshot} style={{ color: '#40a9ff' }}><i className='toolbar-item-active fa fa-check' /></div>
                    <div className={`brush-strokes-config draw-${currentDraw}`}>
                        {
                            currentDraw != darw.Arrow && currentDraw != darw.InputText ? (
                                brushStrokesWidths.map((v, i) => (
                                    <div key={'size' + i} className='brush-strokes-config-item' onClick={(e) => {
                                        e.stopPropagation()
                                        let newBSC = { ...brushStrokesConfig }
                                        newBSC.width = v
                                        setbrushStrokesConfig(newBSC)
                                    }}><div className={`brush-strokes-${i + 1}x`} style={brushStrokesConfig.width === v ? { borderColor: '#91d5ff' } : null} /></div>
                                ))
                            ) : null
                        }
                        {
                            currentDraw == darw.InputText ? (
                                <div className='InputText-size-set'>
                                    {inputTextFontSize}
                                    <div className='InputText-size-list'>
                                        <table>
                                            <tbody>
                                                <tr onClick={() => { middleCanvas.SetInputTextFontSize(15); setinputTextFontSize('小') }}><td>小</td></tr>
                                                <tr onClick={() => { middleCanvas.SetInputTextFontSize(18); setinputTextFontSize('中') }}><td>中</td></tr>
                                                <tr onClick={() => { middleCanvas.SetInputTextFontSize(21); setinputTextFontSize('大') }}><td>大</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null
                        }
                        <div style={{ width: '10px' }}></div>
                        {
                            brushStrokesColors.map(v => (
                                <div key={v} className='brush-strokes-config-item' onClick={(e) => {
                                    e.stopPropagation()
                                    let newBSC = { ...brushStrokesConfig }
                                    newBSC.color = v
                                    setbrushStrokesConfig(newBSC)
                                }}><MyRadio checked={brushStrokesConfig.color === v} hoopColor={v} centerColor={v} /></div>
                            ))
                        }
                    </div>
                </div>
                {
                    ['left-top', 'core-top', 'right-top', 'right-core', 'right-bottom', 'core-bottom', 'left-bottom', 'left-core'].map(v => (
                        <div key={v} className={`controls ${v}`} onMouseDown={(e) => { adjustFrameSize(e, v) }} />
                    ))
                }
            </div>
        </div >
    )
}


enum darw {
    Arrow = "Arrow",
    Line = "Line",
    Dottedline = "Dottedline",
    Circle = "Circle",
    Ellipse = "Ellipse",
    Square = "Square",
    FreeDrawing = 'FreeDrawing',
    Mosaic = 'Mosaic',
    InputText = 'InputText'
}

class CanvasHandle {

    public CanvasDatas: { json: string, canvasInfo: { x: number, y: number, w: number, h: number } }[] = []
    private subscribeCanvasDatas: (datas: string) => void
    private canvasX: number
    private canvasY: number
    private canvasW: number
    private canvasH: number
    public Canvas: fabric.Canvas
    private canvasObject: any
    private strokeColor: string
    private strokeWidth: number
    private fontSize = 18
    private draw: darw
    private isGBO: boolean = false//是否操作了返回上一步操作(进行画画布后重置回false)
    private drawFuncs = new Map<darw, (from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean) => void>([
        [darw.Arrow, this.DrawArrow],
        [darw.Line, this.DrawLine],
        [darw.Dottedline, this.DrawDottedline],
        [darw.Circle, this.DrawCircle],
        [darw.Ellipse, this.DrawEllipse],
        [darw.Square, this.DrawSquare]
    ])

    constructor(ele: HTMLCanvasElement, strokeConfig: { color: string, width: string }) {
        this.Canvas = new fabric.Canvas(ele, {
            isDrawingMode: true,
            //  skipTargetFind: true,
            selectable: false,
            selection: false,
        })
        this.strokeColor = strokeConfig.color
        this.strokeWidth = strokeConfig.width
        this.Canvas.setCursor('crosshair')
        const bcr = ele.getBoundingClientRect()
        this.canvasX = bcr.x
        this.canvasY = bcr.y
        this.canvasW = bcr.width
        this.canvasH = bcr.height

        let [downX, downY, moveX, moveY] = [0, 0, 0, 0]
        let data: areaInfo
        let isMove = false
        let activeObjectRect: { left: number, top: number, width: number, height: number }
        let objectPointData: { center: fabric.Point, left: fabric.Point, right: fabric.Point, pos: fabric.Point }//用于对象缩放控制
        // let scaledDrection: dir = null //当前缩放对象的控制方向
        // let scale = [1, 1]//当前缩放对象的宽高的缩放值
        let oldtime = 0
        this.Canvas.on('mouse:down', e => {
            const ev: MouseEvent = e.e
            const dxy = this.Canvas.getPointer(ev)
            downX = ev.clientX
            downY = ev.clientY
            if (!this.xyIsInCanvas(downX, downY)) return


            if (this.draw == darw.FreeDrawing) {
                document.onmouseup = () => {
                    document.onmouseup = null
                    setTimeout(() => {
                        this.Canvas.getObjects().forEach(o => {
                            if (o.type === 'path' && !o.name) {
                                o.name = darw.FreeDrawing
                                o.selectable = false
                            }
                        })
                        if (this.draw) {
                            this.addCanvasData()
                        }
                    }, 100);
                }
                return
            }


            if (this.draw == darw.Mosaic) {
                document.onmousemove = ev => { this.DrawMosaic(this.toCanvaXY({ x: ev.clientX, y: ev.clientY }), 8) }
                document.onmouseup = () => {
                    document.onmousemove = document.onmouseup = null
                    setTimeout(() => {
                        if (this.draw) {
                            this.isGBO = false
                            this.CanvasDatas.push(this.Canvas.toJSON())
                            this.subscribeCanvasDatas(this.CanvasDatas)
                        }
                    }, 100);
                }
                return
            }

            if (this.draw == darw.InputText) {
                const { x, y } = this.toCanvaXY({ x: downX, y: downY })
                if (!this.canvasObject) { this.DrawText({ x: x, y: y }) }
                let text = (this.canvasObject as fabric.Textbox)
                if (text.text.trim() !== '') {
                    text.exitEditing()
                    this.isGBO = false
                    this.CanvasDatas.push(this.Canvas.toJSON())
                    this.subscribeCanvasDatas(this.CanvasDatas)
                    text = this.DrawText({ x: x, y: y })
                }
                text.exitEditing()
                text.left = x
                text.top = y
                text.enterEditing()
                return
            }

            const activeObj = this.Canvas.getActiveObject()
            if (activeObj) {
                document.onmouseup = () => {
                    document.onmouseup = null
                    objectPointData = activeObjectRect = null
                    if (isMove) {
                        this.addCanvasData()
                        isMove = false
                    }
                }

            } else {
                document.onmousemove = ev => {

                    if (Date.now() - oldtime < 10) return
                    oldtime = Date.now()

                    moveX = ev.clientX
                    moveY = ev.clientY
                    if (this.draw == darw.Arrow) {
                        data = { from: { x: downX, y: downY }, to: { x: moveX, y: moveY } }
                    } else {
                        data = this.limitThePointToTheLT({ x: downX, y: downY }, { x: moveX, y: moveY })
                    }
                    data = { from: this.toCanvaXY(data.from), to: this.toCanvaXY(data.to) }
                    //  data = this.limitThePointToTheLT(dxy, this.canvas.getPointer(ev))
                    //  data = { from: this.toCanvaXY(data.from), to: this.toCanvaXY(data.to) }
                    const { from, to } = data
                    to.x -= this.strokeWidth
                    to.y -= this.strokeWidth
                    if (this.draw) this.drawFuncs.get(this.draw).bind(this)(from, to, false)
                }

                document.onmouseup = () => {
                    document.onmousemove = document.onmouseup = null
                    if (this.draw && data) {
                        this.drawFuncs.get(this.draw).bind(this)(data.from, data.to)
                        this.addCanvasData()
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
                    this.addCanvasData()
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
                    this.addCanvasData()
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
            const value = limitedToDesignatedArea({ from: { x: left, y: top }, to: { x: left + width, y: top + height } }, { from: { x: 0, y: 0 }, to: { x: this.canvasW, y: this.canvasH } })
            activeObj.left = value.from.x
            activeObj.top = value.from.y
        })

        this.Canvas.on('object:scaling', e => {

            // if (Date.now() - oldtime < 30) return
            // oldtime = Date.now()
            const activeObj = e.target
            activeObj.lockScalingX = true
            activeObj.lockScalingY = true
            const { left, top } = activeObj.getBoundingRect()
            if (!objectPointData) {
                objectPointData = { center: activeObj.getPointByOrigin('center', 'center'), left: activeObj.getPointByOrigin('left', 'left'), right: activeObj.getPointByOrigin('right', 'right'), pos: new fabric.Point(left, top) }
            } else {
                const dm = this.getZoomDirectionAndMaxZoom(objectPointData, activeObj)
                objectPointData = { center: activeObj.getPointByOrigin('center', 'center'), left: activeObj.getPointByOrigin('left', 'left'), right: activeObj.getPointByOrigin('right', 'right'), pos: new fabric.Point(left, top) }
                if (dm) {
                    //  console.log(dm)
                    if (activeObj.scaleX >= dm.scale[0]) {
                        activeObj.scaleX = dm.scale[0]
                    }
                    if (activeObj.scaleY >= dm.scale[1]) {
                        activeObj.scaleY = dm.scale[1]

                    }
                }
            }
            activeObj.lockScalingX = false
            activeObj.lockScalingY = false
        })

    }

    //把areaInfo的from限制在左上角
    private limitThePointToTheLT(from: { x: number, y: number }, to: { x: number, y: number }): areaInfo {
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

    //获取缩放的方向和最大缩放率
    private getZoomDirectionAndMaxZoom(oldData: { center: fabric.Point, left: fabric.Point, right: fabric.Point, pos: fabric.Point }, currectObj: fabric.Object): { dir: dir, scale: Array<numbwe> } | null {

        const rect = currectObj.getBoundingRect()
        const [x, y, w, h] = [rect.left, rect.top, rect.width, rect.height]//对象当前的坐标和宽高
        const { scaleX, scaleY } = currectObj.getObjectScaling()//获取对象的缩放率
        const [startW, startH] = [w / scaleX, h / scaleY]//对象创建时的宽高

        const [lt, rt, rb, lb] = [{ x: x, y: y }, { x: x + w, y: y }, { x: x + w, y: y + h }, { x: x, y: y + h }]//计算对象的四个顶点坐标

        //  console.log(scaleX, scaleY, w, h, startW, startH, x, y)
        const { center, left, right, pos } = oldData
        const [c, l, r, p] = [currectObj.getPointByOrigin('center'), currectObj.getPointByOrigin('left'), currectObj.getPointByOrigin('right'), new fabric.Point(x, y)]
        const flag1 = center.x < c.x ? '+' : (center.x > c.x ? '-' : '')
        const flag2 = center.y < c.y ? '+' : (center.y > c.y ? '-' : '')
        const temp = Math.abs(left.x - l.x) - Math.abs(right.x - r.x)
        const flag3 = temp < 0 ? 'right' : temp > 0 ? 'left' : ''

        const posIsChanges = !(Math.abs(p.x - pos.x) < 0.3 && Math.abs(p.y - pos.y) < 0.3)
        if ((flag1 == '+' && flag2 == '+' || flag1 == '-' && flag2 == '-') && flag3 == 'left') return { dir: 'left-top', scale: [rb.x / startW, rb.y / startH] }
        if ((flag1 == '+' && flag2 == '+' || flag1 == '-' && flag2 == '-') && flag3 == 'right') return { dir: 'right-bottom', scale: [(this.canvasW - lt.x) / startW, (this.canvasH - lt.y) / startH] }
        if ((flag1 == '-' && flag2 == '+' || flag1 == '+' && flag2 == '-') && flag3 == 'right') return { dir: 'right-top', scale: [(this.canvasW - lb.x) / startW, lb.y] }
        if ((flag1 == '-' && flag2 == '+' || flag1 == '+' && flag2 == '-') && flag3 == 'left') return { dir: 'left-bottom', scale: [rt.x / startW, (this.canvasH - rt.y) / startH] }
        if ((flag1 == '' && flag2 == '+' || flag1 == '' && flag2 == '-') && posIsChanges == true) return { dir: 'core-top', scale: [scaleX, lb.y / startH] }
        if ((flag1 == '' && flag2 == '+' || flag1 == '' && flag2 == '-') && posIsChanges == false) return { dir: 'core-bottom', scale: [scaleX, (this.canvasH - lt.y) / startH] }
        if ((flag1 == '-' && flag2 == '' || flag1 == '+' && flag2 == '') && posIsChanges == false) return { dir: 'right-core', scale: [(this.canvasW - lt.x) / startW, scaleY] }
        if ((flag1 == '-' && flag2 == '' || flag1 == '+' && flag2 == '') && posIsChanges == true) return { dir: 'left-core', scale: [rt.x / startW, scaleY] }

        return null
    }

    //增加新操作后,添加一个新的画布数据,用于返回上一步操作
    private addCanvasData() {
        this.isGBO = false
        this.CanvasDatas.push({ json: this.Canvas.toJSON(['name', 'selectable', 'hasControls']), canvasInfo: { x: this.canvasX, y: this.canvasY, w: this.canvasW, h: this.canvasH } })
        this.subscribeCanvasDatas(this.CanvasDatas)
    }

    private exec(object: any, isOk?: boolean = true) {
        if (this.canvasObject) this.Canvas.remove(this.canvasObject)
        this.canvasObject = object
        this.Canvas.add(this.canvasObject)
        if (isOk) this.canvasObject = null
    }

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

    public SetCanvasOffset(offsetX: number, offsetY: number) {
        //this.canvas.relativePan(new fabric.Point(offsetX, offsetY))
        this.Canvas.getObjects().forEach(o => {
            o.left += offsetX
            o.top += offsetY
            o.setCoords()
        })
    }

    public SubscribeCanvasDatas(func: (datas: string[]) => void) {
        this.subscribeCanvasDatas = func
    }

    public SetStroke(stroke: { color: string, width: string }) {
        this.Canvas.freeDrawingBrush.color = this.strokeColor = stroke.color
        this.Canvas.freeDrawingBrush.width = this.strokeWidth = stroke.width
    }

    //返回最小刚好包裹画布中所有对象的矩形边框相对与画布的起始坐标和结束坐标
    public GetMinPackageBorder(): areaInfo | null {
        const { from, to } = { from: { x: this.canvasW, y: this.canvasH }, to: { x: 0, y: 0 } }
        const objects = this.Canvas.getObjects()
        if (!objects || objects.length === 0) return null
        for (const obj of objects) {
            if (obj.name === undefined || obj.name == darw.InputText) continue
            const coords: fabric.Point[] = obj.getCoords()
            from.x = coords[0].x <= from.x ? coords[0].x : from.x
            from.y = coords[0].y <= from.y ? coords[0].y : from.y
            to.x = coords[2].x >= to.x ? coords[2].x : to.x
            to.y = coords[2].y >= to.y ? coords[2].y : to.y
        }
        return { from: from, to: to }
    }

    public GoBackOperate(adjust?: (ai: areaInfo) => void) {
        this.Canvas.clear()
        if (!this.isGBO) this.CanvasDatas.pop()//抛弃最新那个画布数据(因为当前的画布画的就是这个数据)
        if (this.Canvas.isEmpty || this.CanvasDatas.length !== 0) { this.subscribeCanvasDatas(this.CanvasDatas) }
        if (this.CanvasDatas.length === 0) return
        const { json, canvasInfo } = this.CanvasDatas.pop()
        if (adjust) adjust({ from: { x: canvasInfo.x, y: canvasInfo.y }, to: { x: canvasInfo.x + canvasInfo.w, y: canvasInfo.y + canvasInfo.h } })
        this.SetCanvasWH(canvasInfo.w, canvasInfo.h)
        this.Canvas.loadFromJSON(json, this.Canvas.renderAll.bind(this.Canvas), (o, object) => {
            // if (!('text' in object)) object.hasControls = false
        })
        this.isGBO = true
    }

    public SetDraw(type: darw) {
        if (this.draw == darw.InputText && this.canvasObject) {
            const text = (this.canvasObject as fabric.Textbox)
            text.exitEditing()
            if (text.text.trim() === '') { this.Canvas.remove(text) }
            else {
                this.addCanvasData()
            }
            this.canvasObject = null
        }
        if (type == darw.FreeDrawing) this.Canvas.isDrawingMode = true
        else this.Canvas.isDrawingMode = false

        if (this.draw == darw.Mosaic) {
            this.Canvas.skipTargetFind = false
        }
        if (type == darw.Mosaic) {
            this.Canvas.skipTargetFind = true
        }
        this.draw = type
    }

    public DrawArrow(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const obj = new fabric.Path(drawArrow(from.x, from.y, to.x, to.y, 30, 30), { stroke: this.strokeColor, fill: "rgba(255,255,255,0)", strokeWidth: 2, name: darw.Arrow })
        obj.setControlsVisibility({ bl: false, br: false, mb: false, ml: false, mr: false, mt: false, tl: false, tr: false, mtr: false })
        this.exec(obj, isOk)
    }

    public DrawLine(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const obj = new fabric.Line([from.x, from.y, to.x, to.y], { stroke: this.strokeColor, strokeWidth: this.strokeWidth, })
        obj.setControlsVisibility({ bl: false, br: false, mb: false, ml: false, mr: false, mt: false, tl: false, tr: false, mtr: false })
        this.exec(obj, isOk)
    }

    public DrawDottedline(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const obj = new fabric.Line([from.x, from.y, to.x, to.y], { strokeDashArray: [3, 1], stroke: this.strokeColor, strokeWidth: this.strokeWidth })
        obj.setControlsVisibility({ bl: false, br: false, mb: false, ml: false, mr: false, mt: false, tl: false, tr: false, mtr: false })
        this.exec(obj, isOk)
    }

    public DrawCircle(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const [left, top] = [from.x, from.y]
        const radius = Math.sqrt((to.x - left) * (to.x - left) + (to.y - top) * (to.y - top)) / 2;
        const obj = canvasObject = new fabric.Circle({ left: left, top: top, fill: "rgba(255, 255, 255, 0)", radius: radius, stroke: this.strokeColor, strokeWidth: this.strokeWidth });
        obj.setControlsVisibility({ bl: false, br: false, mb: false, ml: false, mr: false, mt: false, tl: false, tr: false, mtr: false })
        this.exec(obj, isOk)
    }

    public DrawEllipse(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const [left, top] = [from.x, from.y]
        const obj = new fabric.Ellipse({ left: left, top: top, fill: "rgba(255, 255, 255, 0)", rx: Math.abs(left - to.x) / 2, ry: Math.abs(top - to.y) / 2, stroke: this.strokeColor, strokeWidth: this.strokeWidth, name: darw.Ellipse })
        obj.setControlsVisibility({ mtr: false })
        this.exec(obj, isOk)
    }

    public DrawSquare(from: { x: number, y: number }, to: { x: number, y: number }, isOk?: boolean = true) {
        const path = `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y} L ${from.x} ${to.y} L ${from.x} ${from.y} z`
        const obj = new fabric.Path(path, { left: from.x, top: from.y, fill: "rgba(255, 255, 255, 0)", stroke: this.strokeColor, strokeWidth: this.strokeWidth, name: darw.Square })
        // obj.setControlVisible('mtr', false)
        obj.setControlsVisibility({ mtr: false })
        this.exec(obj, isOk)
    }

    public DrawMosaic(core: { x: number, y: number }, mosaicSize: number) {

        const [x, y, w, h] = [core.x - mosaicSize / 2, core.y - mosaicSize, mosaicSize, mosaicSize]
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
            name: darw.Mosaic
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

        let img_: Image
        if (typeof img === 'string') {
            img_ = new Image()
            img_.crossOrigin = 'anonymous'
            img_.src = img
        } else {
            img_ = img
        }

        img_.onload = e => {
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
    }

    public DrawText(pos: { x: number, y: number }): fabric.Textbox {
        const textbox = new fabric.Textbox('', {
            left: pos.x,
            top: pos.y,
            width: 20,
            fontSize: this.fontSize,
            borderColor: this.strokeColor,
            fill: this.strokeColor,
            name: darw.InputText
        });

        this.Canvas.add(textbox)
        textbox.enterEditing()
        return this.canvasObject = textbox

    }

    public Destroy() {
        this.Canvas.dispose()
    }

}

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
function limitedToDesignatedArea<T extends infoType>(info: T, areaInfo2: areaInfo): T {

    if (info.from !== undefined && info.to !== undefined) {
        const { from, to } = info
        const [w, h] = [to.x - from.x, to.y - from.y]
        if (from.x < areaInfo2.from.x) { from.x = areaInfo2.from.x; to.x = from.x + w }
        if (from.y < areaInfo2.from.y) { from.y = areaInfo2.from.y; to.y = from.y + h }
        if (to.x > areaInfo2.to.x) { to.x = areaInfo2.to.x; from.x = to.x - w }
        if (to.y > areaInfo2.to.y) { to.y = areaInfo2.to.y; from.y = to.y - h }
        return { from: from, to: to }
    } else {
        if (info.x === undefined || info.y === undefined) return
        let { x, y } = info
        if (x < areaInfo2.from.x) { x = areaInfo2.from.x }
        if (y < areaInfo2.from.y) { y = areaInfo2.from.y }
        if (x > areaInfo2.to.x) { x = areaInfo2.to.x }
        if (y > areaInfo2.to.y) { y = areaInfo2.to.y }
        return { x: x, y: y }
    }
}
