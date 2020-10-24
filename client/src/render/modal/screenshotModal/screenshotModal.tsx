
import React, { useRef, useEffect, useState, useMemo } from 'react';
import ReactDom from 'react-dom'
import { MyRadio } from '../../components/components'
import { fabric } from 'fabric'
import mtils from 'mtils'
import { DeepCopy, FileToDataUrl, IsJSONEqual } from '../../common/tools';
import { readFileSync, writeFileSync } from 'fs'
import { ThunderboltFilled } from '@ant-design/icons';
import { clipboard, nativeImage, remote } from 'electron'
import path from 'path'
import os from 'os'
import { Screenshot } from '../../common/dllFunc'
import { CanvasHandle, Darw, Dir, AreaInfo, LimitedToDesignatedArea } from '../../common/canvasHandle'
import { useModal } from '../useModal'
import './screenshotModal.scss'
import { round } from 'lodash';
import { WindowCommunicationType } from '../../net/model';

export interface IModalProps {
}

const brushStrokesColors = ['#ff4d4f', '#ffc53d', '#40a9ff', '#73d13d', '#595959', '#ffffff']//笔触颜色
const brushStrokesWidths = [2, 4, 6]//笔触大小
let mainCanvas: CanvasHandle
let middleCanvas: CanvasHandle
let imageScale = 1

export default function Modal(props: IModalProps) {

    const middleRoot = useRef<HTMLDivElement>()
    const main = useRef<HTMLCanvasElement>()
    const mask = useRef<HTMLCanvasElement>()
    const frame = useRef<HTMLCanvasElement>()
    const middle = useRef<HTMLCanvasElement>()
    const [areaInfo, setareaInfo] = useState<AreaInfo | null>(null)
    const [brushStrokesConfig, setbrushStrokesConfig] = useState<{ color: string, width: number }>({ color: brushStrokesColors[0], width: brushStrokesWidths[0] })
    const [currentDraw, setcurrentDraw] = useState<Darw | null>(null)
    const [isMoveFrame, setisMoveFrame] = useState(false)
    const [canvasDatasIsNull, setcanvasDatasIsNull] = useState(true)//记录用于返回上一步的画布数据是否为空(如果为空,且没操作,那么可以移动或取消截图选区)
    const [inputTextFontSize, setinputTextFontSize] = useState('中')
    const [mosaicWidth, setmosaicWidth] = useState(8)
    const [frameSize, setframeSize] = useState<{ w: number, h: number }>({ w: 0, h: 0 })
    const [startScreenshot, setstartScreenshot] = useState(false)
    const { closeModal } = useModal({})

    //是否可以移动或取消截图选区
    const isCan = useMemo(() => {
        const can = (currentDraw === null && canvasDatasIsNull && startScreenshot)
        if (can && middleCanvas) {
            middleCanvas.Destroy()
            middleCanvas = null
        }
        return can
    }, [currentDraw, canvasDatasIsNull, startScreenshot])

    //画蒙布
    function fillMask() {
        const ctx = mask.current.getContext('2d')
        const [w, h] = [mask.current.width, mask.current.height]
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.fillRect(0, 0, w, h)
    }
    //画方块
    function drawSquare(ctx: CanvasRenderingContext2D, config: { color: string, size: number }, data: AreaInfo) {
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
    function fileFrame(areaInfo: AreaInfo) {
        const ctx = frame.current.getContext('2d')
        ctx.clearRect(0, 0, frame.current.width, frame.current.height)
        drawSquare(ctx, { color: '#a0d911', size: 0.5 }, areaInfo)
    }

    //剪切掉选择区域的蒙布
    function shearMask(areaInfo: AreaInfo) {
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
        let areaInfo_: AreaInfo
        document.onmousemove = (e) => {
            const [incrementX, incrementY] = [e.clientX - startX, e.clientY - startY]
            if (areaInfo) {
                const { from, to } = areaInfo
                areaInfo_ = { from: { x: from.x + incrementX, y: from.y + incrementY }, to: { x: to.x + incrementX, y: to.y + incrementY } }
                areaInfo_ = LimitedToDesignatedArea(areaInfo_, { from: { x: 0, y: 0 }, to: { x: document.body.clientWidth, y: document.body.clientHeight } })
            } else {
                const { x, y } = areaInfo_ = LimitedToDesignatedArea({ x: e.clientX, y: e.clientY }, { from: { x: 0, y: 0 }, to: { x: document.body.clientWidth, y: document.body.clientHeight } })
                areaInfo_ = incrementX > 0 ? { from: { x: startX, y: startY }, to: { x: x, y: y } } : { from: { x: x, y: y }, to: { x: startX, y: startY } }
            }
            areaInfo_ = { from: { x: round(areaInfo_.from.x), y: round(areaInfo_.from.y) }, to: { x: round(areaInfo_.to.x), y: round(areaInfo_.to.y) } }
            fileFrame(areaInfo_)
            shearMask(areaInfo_)
            middleRoot.current.style.left = `${areaInfo_.from.x}px`
            middleRoot.current.style.top = `${areaInfo_.from.y}px`
            //移动边框不需要更新frameSize
            if (areaInfo) return
            setframeSize({ w: areaInfo_.to.x - areaInfo_.from.x, h: areaInfo_.to.y - areaInfo_.from.y })
        }
        document.onmouseup = () => {
            setisMoveFrame(false)
            if (areaInfo_) setareaInfo(areaInfo_)
            document.onmouseup = document.onmousemove = null
        }
    }

    //调整截图选区的大小
    function adjustFrameSize(ev: React.MouseEvent<HTMLDivElement, MouseEvent>, dir: Dir) {
        ev.stopPropagation()
        const { from, to } = DeepCopy(areaInfo)
        const [startX, startY] = [ev.clientX, ev.clientY]
        let newAreaInfo: AreaInfo = DeepCopy(areaInfo)
        let minConstraint: AreaInfo = { from: to, to: from }//调整大小的最小约束
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
            newAreaInfo = { from: { x: round(newAreaInfo.from.x), y: round(newAreaInfo.from.y) }, to: { x: round(newAreaInfo.to.x), y: round(newAreaInfo.to.y) } }
            if (middleCanvas) {
                offsetX = fx - newAreaInfo.from.x
                offsetY = fy - newAreaInfo.from.y
                middleCanvas.SetCanvasOffset(offsetX, offsetY)
                const [from2, to2] = [newAreaInfo.from, newAreaInfo.to]
                middleCanvas.SetCanvasWH(to2.x - from2.x, to2.y - from2.y)
            }
            fileFrame(newAreaInfo)
            shearMask(newAreaInfo)
            const [from2, to2] = [newAreaInfo.from, newAreaInfo.to]
            const [w, h] = [to2.x - from2.x, to2.y - from2.y]
            middleRoot.current.style.left = `${from2.x}px`
            middleRoot.current.style.top = `${from2.y}px`
            middleRoot.current.style.width = `${w}px`
            middleRoot.current.style.height = `${h}px`
            setframeSize({ w: newAreaInfo.to.x - newAreaInfo.from.x, h: newAreaInfo.to.y - newAreaInfo.from.y })
        }

        document.onmouseup = () => {
            document.onmousemove = document.onmouseup = null
            if (newAreaInfo) {
                middleCanvas?.RestoreCanvasOffset()
                setareaInfo(newAreaInfo)
            }
        }
    }

    //右击取消选择的截图区域
    function deselectArea() {
        if (!canvasDatasIsNull) return
        if (areaInfo) {
            setareaInfo(null)
            setcurrentDraw(null)
            const ctx = frame.current.getContext('2d')
            ctx.clearRect(0, 0, frame.current.width, frame.current.height)
            fillMask()
            return
        }
        closeModal()
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
        if (areaInfo) {
            if (!middleCanvas) {
                middleCanvas = new CanvasHandle(middle.current)
            }
            const { from, to } = areaInfo
            const [w, h] = [to.x - from.x, to.y - from.y]
            const dataUrl = mainCanvas.Canvas.toDataURL({ left: from.x, top: from.y, width: w, height: h, format: 'jpeg', quality: 1, multiplier: imageScale, withoutTransform: true })
            const img = new Image()
            img.onload = () => {
                middleCanvas.DrawBackgroundImage(img, w, h, () => {
                    const image = nativeImage.createFromDataURL(middleCanvas.Canvas.toDataURL({ format: 'jpeg', quality: 1, multiplier: imageScale, withoutTransform: true }))
                    const fileName = `${Date.now()}.jpeg`
                    remote.dialog.showSaveDialog(remote.getCurrentWindow(), { title: '另存为', defaultPath: path.join(os.homedir(), 'Desktop', fileName) }).then(v => {
                        writeFileSync(v.filePath, new Uint8Array(image.toPNG(0)))
                        closeModal()
                    }).catch(() => {
                        if (currentDraw === null) {
                            middleCanvas.Destroy()
                            middleCanvas = null
                        }
                    })
                })
            }
            img.src = dataUrl
        }
    }

    function screenshot() {
        if (areaInfo) {
            if (!middleCanvas) {
                middleCanvas = new CanvasHandle(middle.current)
            }
            const { from, to } = areaInfo
            const [w, h] = [to.x - from.x, to.y - from.y]
            const dataUrl = mainCanvas.Canvas.toDataURL({ left: from.x, top: from.y, width: w, height: h, format: 'jpeg', quality: 1, multiplier: imageScale, withoutTransform: true })
            const img = new Image()
            img.onload = () => {
                middleCanvas.DrawBackgroundImage(img, w, h, () => {
                    clipboard.writeImage(nativeImage.createFromDataURL(middleCanvas.Canvas.toDataURL({ format: 'jpeg', quality: 1, multiplier: imageScale, withoutTransform: true })))
                    closeModal('screenshot')
                })
            }
            img.src = dataUrl
        }
    }

    function drawMosaic(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (areaInfo && !isInTheSelectedArea(e.clientX, e.clientY)) return
        if (middleCanvas.Canvas.getActiveObject()) return
        const { width, height } = middleCanvas.Canvas.getElement().getBoundingClientRect()
        const mosaics: fabric.Rect[] = []
        let oldtime = 0
        document.onmousemove = ev => {

            if (Date.now() - oldtime <= 30) return
            oldtime = Date.now()

            if (areaInfo && !isInTheSelectedArea(ev.clientX, ev.clientY)) return
            const pointer = mainCanvas.Canvas.getPointer(ev)
            const [x, y, w, h] = [pointer.x - mosaicWidth / 2, pointer.y - mosaicWidth / 2, mosaicWidth, mosaicWidth]
            const imageData = mainCanvas.Canvas.getContext().getImageData(x, y, w, h)
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
                left: x - areaInfo.from.x,
                top: y - areaInfo.from.y,
                width: w,
                height: h,
                selectable: false,
                name: Darw.Mosaic
            })
            middleCanvas.Canvas.add(obj)
            mosaics.push(obj)
        }
        document.onmouseup = () => {
            document.onmousemove = document.onmouseup = null
            if (mosaics.length === 0) return
            const { from, to } = middleCanvas.GetObjectsMinPackageBorder(mosaics)
            const mosaicGroup = new fabric.Group(mosaics, { left: from.x, top: from.y, selectable: false })
            const dataUrl = mosaicGroup.toDataURL({ format: 'jpeg', quality: 1, multiplier: 0.8 })
            mosaicGroup.destroy()
            fabric.Image.fromURL(dataUrl, image => {
                middleCanvas.Canvas.remove(mosaics)
                middleCanvas.Canvas.add(image)
                setTimeout(() => {
                    if (currentDraw == Darw.Mosaic) {
                        middleCanvas?.AddCanvasData()
                    }
                }, 100)
            }, { left: from.x, top: from.y, selectable: false, opacity: 0, name: Darw.Mosaic })
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
        const exceed = (areaInfo.to.x - areaInfo.from.x) >= 300 ? 0 : 300 - (areaInfo.to.x - areaInfo.from.x)//工具栏超出截图区的宽度
        class_ += ((areaInfo.to.y + 70) > document.body.clientHeight ? ' top' : ' bottom')
        if ((areaInfo.from.y - 70 <= 0) && (areaInfo.to.y + 70 > document.body.clientHeight)) class_ = 'screenshot-toolbar inside'
        class_ += exceed === 0 ? ' right' : (areaInfo.from.x >= exceed ? ' right' : ' left')
        return class_
    }, [areaInfo])

    const frameSizeClass = useMemo(() => {
        if (!areaInfo) return 'frame-size left'
        let class_ = 'frame-size'
        if (areaInfo.from.y < 25) class_ += ' inside'
        class_ += ((document.body.clientWidth - areaInfo.from.x <= 60) ? ' right' : ' left')
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
            if (currentDraw != Darw.Mosaic) middleCanvas.SetDraw(currentDraw)
            else middleCanvas.SetDraw(null)
            middleCanvas.SetStroke(brushStrokesConfig)
        }
    }, [currentDraw, brushStrokesConfig])

    useEffect(() => {
        if (main) {
            mainCanvas = new CanvasHandle(main.current)
            Screenshot().then(v => {
                if (mask) { fillMask() }
                const img = new Image()
                img.onload = () => {
                    imageScale = img.width / screen.width
                    mainCanvas.DrawImage(img, { x: 0, y: 0, sw: screen.width, sh: screen.height })
                    setstartScreenshot(true)
                    //  console.log(img.width, img.height, screen.width, screen.height)
                    //  mainCanvas.DrawBackgroundImage(img, screen.width, screen.height)
                }
                const file = new File([v.buffer], 'window.png', { type: 'image/png' })
                img.src = URL.createObjectURL(file)
            })
        }
    }, [])

    return (
        <div className='screenshot' style={!areaInfo ? { cursor: 'crosshair' } : null} onMouseDown={isCan ? startFillFrame : null} onContextMenu={deselectArea}>
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-main' ref={main} />
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-mask' ref={mask} />
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-frame' ref={frame} />
            <div className='screenshot-middle' style={middleStyle} ref={middleRoot} onMouseDown={currentDraw == Darw.Mosaic ? drawMosaic : null}>
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                    <canvas style={middleCanvasStyle} ref={middle} />
                </div>
                <div className={toolbarClass} style={areaInfo && !isMoveFrame ? { display: 'inline-flex' } : null}>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == Darw.Square ? null : Darw.Square) }}><i className='toolbar-item-active fa fa-square-o' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == Darw.Ellipse ? null : Darw.Ellipse) }}><i className='toolbar-item-active fa fa-circle-thin' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == Darw.Arrow ? null : Darw.Arrow) }}><i className='toolbar-item-active fa fa-long-arrow-right' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == Darw.FreeDrawing ? null : Darw.FreeDrawing) }}><i className='toolbar-item-active fa fa-paint-brush' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == Darw.Mosaic ? null : Darw.Mosaic) }}><img className='toolbar-item-active' width={18} src={require('../../static/img/马赛克.png').default} /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { setcurrentDraw(currentDraw == Darw.InputText ? null : Darw.InputText) }}><img className='toolbar-item-active' width={18} src={require('../../static/img/text.png').default} /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={goBackOperate} ><i className='toolbar-item-active fa fa-mail-reply' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={saveAs}><i className='toolbar-item-active fa fa-download' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={() => { closeModal() }} style={{ color: 'red' }}><i className='toolbar-item-active fa fa-close' /></div>
                    <div className='toolbar-item' onMouseDown={e => { e.stopPropagation() }} onClick={screenshot} style={{ color: '#40a9ff' }}><i className='toolbar-item-active fa fa-check' /></div>
                    <div className={`brush-strokes-config draw-${currentDraw}`}>
                        {
                            currentDraw == Darw.Mosaic ? (
                                brushStrokesWidths.map((v, i) => (
                                    <div key={'mosaic' + i} className='brush-strokes-config-item' onClick={(e) => {
                                        e.stopPropagation()
                                        setmosaicWidth(8 + i * 2)
                                    }}><div className={`brush-strokes-${i + 1}x`} style={mosaicWidth === (8 + i * 2) ? { borderColor: '#91d5ff' } : null} /></div>
                                ))
                            ) : null
                        }
                        {
                            currentDraw != Darw.Arrow && currentDraw != Darw.InputText && currentDraw != Darw.Mosaic ? (
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
                            currentDraw == Darw.InputText ? (
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
                            currentDraw != Darw.Mosaic ? (
                                brushStrokesColors.map(v => (
                                    <div key={v} className='brush-strokes-config-item' onClick={(e) => {
                                        e.stopPropagation()
                                        let newBSC = { ...brushStrokesConfig }
                                        newBSC.color = v
                                        setbrushStrokesConfig(newBSC)
                                    }}><MyRadio checked={brushStrokesConfig.color === v} hoopColor={v} centerColor={v} /></div>
                                ))
                            ) : null
                        }
                    </div>
                </div>
                {
                    ['left-top', 'core-top', 'right-top', 'right-core', 'right-bottom', 'core-bottom', 'left-bottom', 'left-core'].map(v => (
                        <div key={v} className={`controls ${v}`} onMouseDown={(e) => { adjustFrameSize(e, v) }} />
                    ))
                }
                {areaInfo ? (
                    <div className={frameSizeClass}>{`${frameSize.w} x ${frameSize.h}`}</div>
                ) : null}
            </div>
        </div >
    )
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))