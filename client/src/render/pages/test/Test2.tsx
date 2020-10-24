import React, { useRef, useEffect, useState, useMemo } from 'react';
import { MyRadio } from '../../components/components'
import fabric from 'fabric'
import mtils from 'mtils'
import './test.scss'


export interface ITestProps {
}

type frameInfoT = { x: number, y: number, w: number, h: number }
type operateType = 'draw-square' | 'draw-ellipse' | ''
type operate = { id: string, type: operateType, brushStrokesConfig?: { color: string, size: number }, data: any }
const brushStrokesColor = ['#ff4d4f', '#ffc53d', '#40a9ff', '#73d13d', '#595959']//笔触颜色
const brushStrokesSize = [2, 4, 6]//笔触大小

export default function Test(props: ITestProps) {

    const main = useRef<HTMLCanvasElement>()
    const mask = useRef<HTMLCanvasElement>()
    const frame = useRef<HTMLCanvasElement>()
    const middle = useRef<HTMLCanvasElement>()
    const [frameInfo, setframeInfo] = useState<frameInfoT | null>(null)
    const [brushStrokesConfig, setbrushStrokesConfig] = useState<{ color: string, size: number }>({ color: brushStrokesColor[0], size: brushStrokesSize[0] })
    const [currentOperateType, setcurrentOperateType] = useState<operateType>('')
    //  const [operateGather, setoperateGather] = useState<operate[]>([])
    const [imageDatas, setimageDatas] = useState<ImageData[]>([])
    const [isMoveFrame, setisMoveFrame] = useState(false)

    //画蒙布
    function fillMask() {
        const ctx = mask.current.getContext('2d')
        const [w, h] = [mask.current.width, mask.current.height]
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.fillRect(0, 0, w, h)
    }

    //画方块
    function drawSquare(ctx: CanvasRenderingContext2D, config: { color: string, size: number }, data: frameInfoT) {
        const { x, y, w, h } = data
        ctx.beginPath()
        ctx.lineWidth = config.size
        ctx.moveTo(x, y)
        ctx.lineTo(x + w, y)
        ctx.lineTo(x + w, y + h)
        ctx.lineTo(x, y + h)
        ctx.lineTo(x, y)
        ctx.strokeStyle = config.color
        ctx.stroke()
    }

    //画椭圆
    function drawEllipse(ctx: CanvasRenderingContext2D, config: { color: string, size: number }, data: frameInfoT) {
        const [a, b] = [data.w / 2, data.h / 2]
        const [x, y] = [data.x + a, data.y + b]
        const step = (a > b) ? 1 / a : 1 / b;
        ctx.beginPath()
        ctx.lineWidth = config.size
        ctx.moveTo(x + a, y)
        for (let i = 0; i < 2 * Math.PI; i += step) {
            ctx.lineTo(x + a * Math.cos(i), y + b * Math.sin(i));
        }
        ctx.closePath()
        ctx.strokeStyle = config.color
        ctx.stroke()
    }

    const drawFuncs = useMemo(() => (
        new Map<operateType, (ctx: CanvasRenderingContext2D, config?: { color: string, size: number }, data: any) => void>([['draw-square', drawSquare], ['draw-ellipse', drawEllipse]])
    ), [])

    //判断鼠标是否在选择区域内(只有鼠标在选中区域内才可以移动区域(编辑后不可移动))
    function isInTheSelectedArea(x_: number, y_: number): boolean {
        if (!frameInfo) return false
        const { x, y, w, h } = frameInfo
        return x_ >= x && x + w >= x_ && y_ >= y && y + h >= y_
    }

    //画选择区域的边框
    function fileFrame(frameInfo: frameInfoT) {
        const ctx = frame.current.getContext('2d')
        ctx.clearRect(0, 0, frame.current.width, frame.current.height)
        drawSquare(ctx, { color: '#a0d911', size: 0.5 }, frameInfo)
    }

    //剪切掉选择区域的蒙布
    function shearMask(frameInfo: frameInfoT) {
        const { x, y, w, h } = frameInfo
        const ctx = mask.current.getContext('2d')
        fillMask()
        ctx.clearRect(x, y, w, h)
    }

    //移动.screenshot-middle(跟着选中区域移动)
    function moveMiddleCanvas(frameInfo: frameInfoT) {
        const { x, y } = frameInfo
        middle.current.style.top = `${y}px`
        middle.current.style.left = `${x}px`
    }

    //限制画画布时的移动坐标在指定区域
    function limitedToDesignatedArea(xy: { x: number, y: number }, frameInfo: frameInfoT): { x: number, y: number } {
        let { x, y } = xy
        if (frameInfo.x > x) { x = frameInfo.x }
        else if (frameInfo.x + frameInfo.w < x) { x = frameInfo.x + frameInfo.w }
        if (frameInfo.y > y) { y = frameInfo.y }
        else if (frameInfo.y + frameInfo.h < y) { y = frameInfo.y + frameInfo.h }
        return { x: x, y: y }
    }

    //选择截图区域或移动截图区域的事件函数
    function startFillFrame(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const [startX, startY] = [ev.clientX, ev.clientY]
        if (frameInfo && !isInTheSelectedArea(startX, startY)) return
        setisMoveFrame(true)
        const [offsetX, offsetY] = frameInfo ? [startX - frameInfo.x, startY - frameInfo.y] : [0, 0]//边框与鼠标的坐标偏移
        let frameInfo_: frameInfoT
        document.onmousemove = (e) => {
            const { x, y } = limitedToDesignatedArea({ x: e.clientX, y: e.clientY }, { x: 0, y: 0, w: document.body.clientWidth, h: document.body.clientHeight })
            if (frameInfo) {
                frameInfo_ = { x: x - offsetX, y: y - offsetY, w: frameInfo.w, h: frameInfo.h }
            } else {
                frameInfo_ = x - startX >= 0 ? { x: startX, y: startY, w: x - startX, h: y - startY } : { x: x, y: y, w: startX - x, h: startY - y }
            }
            fileFrame(frameInfo_)
            shearMask(frameInfo_)
            if (frameInfo) moveMiddleCanvas(frameInfo_)//确定当前操作是移动选择区域
        }
        document.onmouseup = () => {
            setisMoveFrame(false)
            if (frameInfo_) setframeInfo(frameInfo_)
            document.onmouseup = document.onmousemove = null
        }
    }

    //右击取消选择的截图区域
    function deselectArea() {
        if (imageDatas.length > 0) return
        setcurrentOperateType('')
        const ctx = frame.current.getContext('2d')
        ctx.clearRect(0, 0, frame.current.width, frame.current.height)
        fillMask()
        setframeInfo(null)
    }

    //把操作画到主画布
    function drawMainCanvas(operate: operate) {
        const ctx = main.current.getContext('2d')
        const func = drawFuncs.get(operate.type)
        if (func) { func(ctx, operate.brushStrokesConfig, operate.data) }
    }

    //画画布的事件函数
    function startDrawCanvas(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const [startX, startY] = [ev.clientX, ev.clientY]
        middle.current.style.cursor = 'crosshair'
        let data: frameInfoT
        const middleCtx = middle.current.getContext('2d')
        let config = null
        let operateType = null
        setcurrentOperateType(currentOperateType => operateType = currentOperateType)
        document.onmousemove = (e) => {
            let { x, y } = limitedToDesignatedArea({ x: e.clientX, y: e.clientY }, frameInfo)
            data = x - startX > 0 ? { x: startX, y: startY, w: x - startX, h: y - startY } : { x: x, y: y, w: startX - x, h: startY - y }
            middleCtx.clearRect(0, 0, middle.current.width, middle.current.height)
            setbrushStrokesConfig(brushStrokesConfig => {
                config = brushStrokesConfig
                const func = drawFuncs.get(operateType)
                if (func) { func(middleCtx, config, { x: data.x - frameInfo.x, y: data.y - frameInfo.y, w: data.w, h: data.h }) }
                return brushStrokesConfig
            })
        }

        document.onmouseup = () => {
            if (data) {
                middleCtx.clearRect(0, 0, middle.current.width, middle.current.height)
                const operate: operate = { id: mtils.security.uuid(25, 16), type: operateType, brushStrokesConfig: config, data: data }
                //  setoperateGather(operateGather => operateGather.concat([operate]))
                const ctx = main.current.getContext('2d')
                setimageDatas(imageDatas => imageDatas.concat([ctx.getImageData(0, 0, main.current.width, main.current.height)]))
                drawMainCanvas(operate)
            }
            document.onmousemove = document.onmouseup = null
        }
    }

    //回退操作
    function goBackOperate() {
        const ctx = main.current.getContext('2d')
        ctx.clearRect(0, 0, main.current.width, main.current.height)
        if (imageDatas.length === 0) return
        let newImageDatas = [...imageDatas]
        ctx.putImageData(newImageDatas.pop(), 0, 0, 0, 0, main.current.width, main.current.height)
        setimageDatas(newImageDatas)


        // let newOperateGather = [...operateGather]
        // newOperateGather.pop()
        // const operates = newOperateGather.reduce((pv, cv) => {
        //     pv[cv.id] = cv
        //     return pv
        // }, {} as { [id: string]: operate })
        // const ctx = main.current.getContext('2d')
        // ctx.clearRect(0, 0, main.current.width, main.current.height)
        // for (const o of Object.values(operates)) {
        //     drawMainCanvas(o)
        // }
        // setoperateGather(newOperateGather)
    }

    const startdrawcanvas = useMemo(() => {
        //const func = new Map<operateType, (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void>([['draw-square', startDrawSquare], ['', null]])
        return currentOperateType !== '' ? startDrawCanvas : null
    }, [currentOperateType])

    const middleStyle = useMemo<React.CSSProperties>(() => {
        if (!frameInfo) return { width: 0, height: 0, top: 0, left: 0 }
        const { x, y, w, h } = frameInfo
        return { width: `${w}px`, height: `${h}px`, top: `${y}px`, left: `${x}px` }
    }, [frameInfo])

    useEffect(() => {
        if (currentOperateType === '' && middle) middle.current.style.cursor = 'move'
        else if (middle) middle.current.style.cursor = 'pointer'
    }, [currentOperateType])
    useEffect(() => { if (mask) { fillMask() } }, [])

    return (
        <div className='screenshot' style={!frameInfo ? { cursor: 'crosshair' } : null} onMouseDown={currentOperateType === '' && imageDatas.length === 0 ? startFillFrame : null} onContextMenu={deselectArea}>
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-main' ref={main} />
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-mask' ref={mask} />
            <canvas width={document.body.clientWidth} height={document.body.clientHeight} className='screenshot-frame' ref={frame} />
            <div className='screenshot-middle' style={middleStyle}>
                <canvas onMouseDown={startdrawcanvas} width={frameInfo ? frameInfo.w : 0} height={frameInfo ? frameInfo.h : 0} style={{ width: middleStyle.width, height: middleStyle.height }} ref={middle} />
                <div className='screenshot-toolbar' style={frameInfo && !isMoveFrame ? { display: 'inline-flex' } : null}>
                    <div className='toolbar-item' onClick={() => { setcurrentOperateType(currentOperateType === 'draw-square' ? '' : 'draw-square') }}><i className='toolbar-item-active fa fa-square-o' /></div>
                    <div className='toolbar-item' onClick={() => { setcurrentOperateType(currentOperateType === 'draw-ellipse' ? '' : 'draw-ellipse') }}><i className='toolbar-item-active fa fa-circle-o' /></div>
                    <div className='toolbar-item' onClick={goBackOperate} ><i className='toolbar-item-active fa fa-mail-reply' /></div>
                    <div className={`brush-strokes-config ${currentOperateType}`}>
                        {
                            brushStrokesSize.map((v, i) => (
                                <div key={'size' + i} className='brush-strokes-config-item' onClick={(e) => {
                                    e.stopPropagation()
                                    let newBSC = { ...brushStrokesConfig }
                                    newBSC.size = v
                                    setbrushStrokesConfig(newBSC)
                                }}><div className={`brush-strokes-${i + 1}x`} style={brushStrokesConfig.size === v ? { borderColor: '#91d5ff' } : null} /></div>
                            ))
                        }
                        <div style={{ width: '10px' }}></div>
                        {
                            brushStrokesColor.map(v => (
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
            </div>
        </div >
    )
}
