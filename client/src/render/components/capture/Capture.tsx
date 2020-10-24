import React, { useRef, useEffect, useState } from 'react';
import './capture.scss'
import { Button, Popover, Slider, Space } from 'antd'
import anime from 'animejs'
import { FileToDataUrl, DataUrlToFile } from '../../common/tools'

export interface ICaptureProps {
    onCaptureSubmit?: (imgFile: File) => void
    panelWidth?: number
}

export default function Capture(props: ICaptureProps) {

    const { onCaptureSubmit, panelWidth } = props
    const [width, setwidth] = useState<number>(panelWidth >= 300 ? panelWidth : 300)
    const [height, setheight] = useState<number>(panelWidth >= 300 ? panelWidth : 300)
    const [sliderValue, setsliderValue] = useState<number>(0)//控制放大imgVanvas的Slider的值
    const [angle, setangle] = useState<number>(0)
    const [isCapture, setisCapture] = useState<boolean>(false)//是否重置了剪切的标准 用于控制是否可以点击提交
    const maskCanvas = useRef<HTMLCanvasElement>()//蒙布画布
    const gridCanvas = useRef<HTMLCanvasElement>()//网格画布
    const imgCanvas = useRef<HTMLCanvasElement>()//图片画布
    const rectImgShow = useRef<HTMLCanvasElement>()//矩形剪切展示的画布
    const roundImgShow = useRef<HTMLCanvasElement>()//圆形剪切的画布
    const [visibleCap, setvisibleCap] = useState<boolean>(false)//用于控制是否显示剪切操作界面的控制 选择要剪切的图片后显示
    const [imgData, setimgData] = useState<string>('')//用于存储file转换来的dataurl 用于imgCanvas展示
    const imgFormat = ["jpg", "png", "jpeg"]// 图片上传格式

    function loadingImg(e: ProgressEvent<HTMLInputElement>) {
        if (e.target.files.length != 0) {
            let file = e.target.files[0];
            let str = file.name.split(".").pop();
            if (imgFormat.indexOf(str) != -1) {
                FileToDataUrl(file, data => {
                    setimgData(data)
                    let img = new Image()
                    img.src = data
                    img.onload = e => {
                        fillImgCanvas(0, img)
                    }
                    initMskAndGrid()
                    setvisibleCap(true)
                });
            } else {
                console.log('文件类型错误!')
            }
        }
    }

    function fillMaskCanvas() {
        let ctx = maskCanvas.current.getContext('2d')
        const [w, h] = [maskCanvas.current.width, maskCanvas.current.height]
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, w, h);
        ctx.clearRect(w / 6, h / 6, w * 2 / 3, h * 2 / 3);
    }

    //网格的大小为maskVanvas的2/3
    function fillGridCanvas() {
        gridCanvas.current.style.top = '50%'
        gridCanvas.current.style.left = '50%'
        const [w, h] = [gridCanvas.current.width, gridCanvas.current.height]
        gridCanvas.current.style.margin = `-${h / 2}px 0 0 -${w / 2}px`
        let ctx = gridCanvas.current.getContext('2d')
        ctx.clearRect(0, 0, w, h)
        ctx.beginPath()
        ctx.lineWidth = 1

        ctx.moveTo(0, 0)
        ctx.lineTo(5, 0)
        ctx.moveTo(0, 0)
        ctx.lineTo(0, 5)

        ctx.moveTo(w - 5, 0)
        ctx.lineTo(w, 0)
        ctx.moveTo(w, 0)
        ctx.lineTo(w, 5)

        ctx.moveTo(w, h - 5)
        ctx.lineTo(w, h)
        ctx.moveTo(w, h)
        ctx.lineTo(w - 5, h)

        ctx.moveTo(5, h)
        ctx.lineTo(0, h)
        ctx.moveTo(0, h)
        ctx.lineTo(0, h - 5)

        ctx.moveTo(4, 4)
        ctx.lineTo(w - 4, 4)
        ctx.lineTo(w - 4, h - 4)
        ctx.lineTo(4, h - 4)
        ctx.lineTo(4, 4)

        ctx.lineWidth = 2
        ctx.moveTo(w / 3 + 4, 4)
        ctx.lineTo(w / 3 + 4, h - 4)
        ctx.moveTo(w / 3 * 2, 4)
        ctx.lineTo(w / 3 * 2, h - 4)
        ctx.moveTo(4, h / 3 + 4)
        ctx.lineTo(w - 4, h / 3 + 4)
        ctx.moveTo(4, h / 3 * 2)
        ctx.lineTo(w - 4, h / 3 * 2)
        ctx.strokeStyle = '#bae7ff'
        ctx.stroke()

    }

    function fillImgCanvas(enlargeValue: number, img: Image) {
        //console.log(`angle:${angle}`)
        let value = width * 2 / 3 + width * 2 / 3 * 0.01 * enlargeValue
        const [imgW, imgH] = [img.width, img.height]
        let [canvasW, canvasH] = imgH > imgW ? [value, value * imgH / imgW] : [value * imgW / imgH, value]
        //如果旋转的角度是90或270就把宽高反转
        imgCanvas.current.width = angle % 180 === 90 ? canvasH : canvasW
        imgCanvas.current.height = angle % 180 === 90 ? canvasW : canvasH
        let ctx = imgCanvas.current.getContext('2d')
        ctx.clearRect(0, 0, canvasW, canvasH)
        if (angle > 0) {
            const [coreX, coreY] = [imgCanvas.current.width / 2, imgCanvas.current.height / 2]
            ctx.translate(coreX, coreY)
            ctx.rotate(angle * Math.PI / 180)
            ctx.translate(-canvasW / 2, -canvasH / 2)
        }
        ctx.drawImage(img, 0, 0, canvasW, canvasH)
        imgCanvas.current.style.top = '50%'
        imgCanvas.current.style.left = '50%'
        imgCanvas.current.style.margin = `-${imgCanvas.current.height / 2}px 0 0 -${imgCanvas.current.width / 2}px`

    }

    //放大画布
    function enlargeCanvas(enlargeValue: number) {
        setsliderValue(enlargeValue)
        let img = new Image()
        img.src = imgData
        img.onload = e => {
            fillImgCanvas(enlargeValue, img)
        }
    }

    //滚动鼠标调节图片大小
    function onWhelAdjustImgSize(e: React.WheelEvent<HTMLElement>) {
        const flag = e.deltaY < 0 ? '+' : '-'
        let currectEnlarge = sliderValue
        if (flag === '+') {
            currectEnlarge = currectEnlarge + 1 >= 100 ? 100 : currectEnlarge + 1
        } else {
            currectEnlarge = currectEnlarge - 1 <= 0 ? 0 : currectEnlarge - 1
        }
        enlargeCanvas(currectEnlarge)
    }

    //初始蒙布和网格
    function initMskAndGrid() {
        fillMaskCanvas()
        fillGridCanvas()
    }

    //旋转画布控制
    function rotateCanvas() {
        let img = new Image()
        img.src = imgData
        let _angle = angle + 90
        setangle(_angle)
        const [canvasW, canvasH] = [imgCanvas.current.width, imgCanvas.current.height]
        const [offsetTo, offsetLeft] = [imgCanvas.current.offsetTop, imgCanvas.current.offsetLeft]
        let ctx = imgCanvas.current.getContext('2d')
        ctx.clearRect(0, 0, canvasW, canvasH)
        imgCanvas.current.width = canvasH
        imgCanvas.current.height = canvasW
        imgCanvas.current.style.top = offsetLeft + 'px'
        imgCanvas.current.style.left = offsetTo + 'px'
        imgCanvas.current.style.margin = '0'
        ctx.translate(canvasH / 2, canvasW / 2)
        ctx.rotate(_angle * Math.PI / 180)
        img.onload = e => {
            if (_angle % 180 === 90) {
                ctx.translate(-(canvasW / 2), -(canvasH / 2))
                ctx.drawImage(img, 0, 0, canvasW, canvasH)
            } else {
                ctx.translate(-(canvasH / 2), -(canvasW / 2))
                ctx.drawImage(img, 0, 0, canvasH, canvasW)
            }
        }
        _angle === 360 ? setangle(0) : false
    }

    //拖动画布控制
    function dragCanvas(e: MouseEvent) {
        const [downX, downY] = [e.clientX, e.clientY]
        const [canvasOffsetTop, canvasOffsetLeft] = [imgCanvas.current.offsetTop, imgCanvas.current.offsetLeft]
        const [canvasOffsetBottom, canvasOffsetRight] = [imgCanvas.current.height + canvasOffsetTop, imgCanvas.current.width + canvasOffsetLeft]
        const [gridOffsetTop, gridOffsetLeft] = [gridCanvas.current.offsetTop + 4, gridCanvas.current.offsetLeft + 4]//加4后才是内边框
        const [gridOffsetBottom, gridOffsetRight] = [gridOffsetTop + gridCanvas.current.height - 8, gridOffsetLeft + gridCanvas.current.width - 8]//减8后才是内边框的宽高
        document.onmousemove = e => {
            let [movingX, movingY] = [e.clientX - downX, e.clientY - downY]
            movingX = (canvasOffsetLeft + movingX) < gridOffsetLeft ? movingX : imgCanvas.current.offsetLeft - canvasOffsetLeft //判断画布左边是否进入网格 进入网格不可拖动
            movingY = (canvasOffsetTop + movingY) < gridOffsetTop ? movingY : imgCanvas.current.offsetTop - canvasOffsetTop + 0.3   //上边
            movingX = (canvasOffsetRight + movingX) > gridOffsetRight ? movingX : imgCanvas.current.offsetLeft - canvasOffsetLeft//右边
            movingY = (canvasOffsetBottom + movingY) > gridOffsetBottom ? movingY : imgCanvas.current.offsetTop - canvasOffsetTop//下边
            imgCanvas.current.style.top = canvasOffsetTop + movingY + 'px'
            imgCanvas.current.style.left = canvasOffsetLeft + movingX + 'px'
            imgCanvas.current.style.margin = '0'
        }

        document.onmouseup = () => {
            document.onmousemove = null
            document.onmouseup = null
        }
    }
    //剪切画布控制
    function captureImg() {
        let x = gridCanvas.current.offsetLeft - imgCanvas.current.offsetLeft + 4//加4才是内框
        let y = gridCanvas.current.offsetTop - imgCanvas.current.offsetTop + 4
        let imgData = imgCanvas.current.getContext('2d').getImageData(x, y, width * 2 / 3, height * 2 / 3)
        rectImgShow.current.getContext('2d').putImageData(imgData, 0, 0)
        roundImgShow.current.getContext('2d').putImageData(imgData, 0, 0)
        setisCapture(true)
    }

    function submit() {
        if (!isCapture) return
        let dataUrl = rectImgShow.current.toDataURL('image/png')
        let file = DataUrlToFile(dataUrl, 'head')
        onCaptureSubmit ? onCaptureSubmit(file) : false
        setisCapture(false)
    }

    function close() {
        rectImgShow.current.getContext('2d').clearRect(0, 0, rectImgShow.current.width, rectImgShow.current.height)
        roundImgShow.current.getContext('2d').clearRect(0, 0, roundImgShow.current.width, roundImgShow.current.height)
        setsliderValue(0)
        setvisibleCap(false)
        setisCapture(false)
    }

    return (
        <div className='capture'>

            <div className='upload-but' style={{ visibility: !visibleCap ? 'visible' : 'hidden' }}>
                <Space align='center' direction='vertical' size={3}>
                    <p><svg viewBox="64 64 896 896" focusable="false" data-icon="plus" width="1em" height="1em" fill="currentColor" aria-hidden="true"><defs><style></style></defs><path d="M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z"></path><path d="M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z"></path></svg></p>
                    <p>添加图片</p>
                </Space>
                <input className='upload-input' onChange={loadingImg} type="file" multiple={false} title=" " />
            </div>

            <div style={{ visibility: visibleCap ? 'visible' : 'hidden', display: 'flex', flexDirection: 'row' }}>
                <div>
                    <div className='mask-and-grid' style={{ width: `${width}px`, height: `${height}px` }}>
                        <canvas width={width} height={height} ref={maskCanvas} style={{ position: 'absolute', top: 0, left: 0, zIndex: 99 }}></canvas>
                        <canvas ref={imgCanvas} style={{ position: 'absolute' }}></canvas>
                        <canvas onWheel={onWhelAdjustImgSize} onMouseDown={dragCanvas} id='grid-canvas' width={width * 2 / 3 + 8} height={height * 2 / 3 + 8} ref={gridCanvas} style={{ position: 'absolute', cursor: 'pointer', zIndex: 100 }}></canvas>
                    </div>
                    <div className='capture-action' style={{ width: `${width}px` }}>
                        <div className='capture-actio-item' onClick={rotateCanvas}><img width={20} src={require('../../static/svg/顺时针旋转.svg').default} alt="" /></div>
                        <div className='capture-actio-item' onClick={captureImg}><img width={25} src={require('../../static/svg/图片剪切.svg').default} alt="" /></div>
                        <Popover content={<div style={{ width: '100px' }}><Slider value={sliderValue} onChange={enlargeCanvas} /></div>} trigger="click">
                            <div className='capture-actio-item'><img width={20} src={require('../../static/svg/按比例放大.svg').default} alt="" /></div>
                        </Popover>
                        <div className='capture-actio-item' onClick={submit}><img width={20} src={require('../../static/svg/提交.svg').default} style={{ cursor: isCapture ? 'pointer' : 'not-allowed' }} alt="" /></div>
                        {/* <div className='capture-actio-item' onClick={close}><img width={20} src={require('../../static/svg/取消.svg').default} alt="" /></div> */}
                        <div className='capture-actio-item' onClick={close}><img width={20} src={require('../../static/svg/关闭2.svg').default} alt="" /></div>

                    </div>
                </div>
                <div className='capture-show' style={{ height: `${height}px` }}>
                    <canvas ref={rectImgShow} width={width * 2 / 3} height={height * 2 / 3} style={{ width: '140px', height: '140px', marginBottom: 5 }}></canvas>
                    <canvas ref={roundImgShow} width={width * 2 / 3} height={height * 2 / 3} style={{ width: '140px', height: '140px', borderRadius: '50%' }}></canvas>
                </div>
            </div>
        </div >
    )
}
