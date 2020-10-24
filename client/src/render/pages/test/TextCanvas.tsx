import React, { useRef, useEffect } from 'react';
import { fabric } from 'fabric'

export interface IAppProps {
}

export default function App(props: IAppProps) {

    const can = useRef<HTMLCanvasElement>()

    useEffect(() => {
        // if (can) {
        //     const canv = new fabric.Canvas(can.current, { width: 250, height: 250, }).setZoom(1)
        //     const react = new fabric.Rect({ left: 0, top: 0, width: 50, height: 50, fill: '#fff' })
        //     canv.add(react)
        //     canv.relativePan(new fabric.Point(10, 10))
        //     const react2 = new fabric.Rect({ left: -10, top: -10, width: 50, height: 50, fill: '#40a9ff' })
        //     canv.add(react)
        // }
    }, [])

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <canvas ref={can} style={{ position: 'absolute', top: '50%', left: '50%', width: '250px', height: '250px', border: '1px solid #fff' }}></canvas>
        </div>
    );
}
