import React, { useState, useEffect } from 'react';
import chroma from 'chroma-js'
import './myRadio.scss'

export interface IMyRadioProps {
    checked?: boolean,
    hoopColor?: string,
    centerColor?: string,
}

export default function MyRadio(props: IMyRadioProps) {

    const { checked, hoopColor, centerColor } = props
    const [check, setcheck] = useState<boolean>(checked ? checked : false)
    const [colorRgb, setcolorRgb] = useState<number[]>(chroma(hoopColor ? hoopColor : '#69c0ff').rgb() as number[])

    useEffect(() => {
        setcheck(checked)
        return () => { }
    }, [checked])

    return (
        <div className={`my-radio ${check ? 'active' : ''}`}>
            <div className='radio-center' style={{ borderColor: centerColor ? centerColor : '#d9d9d9' }}></div>
            <div className='radio-hoop' style={{ borderColor: hoopColor, boxShadow: `0 2px 25px rgba(${colorRgb[0]},${colorRgb[1]},${colorRgb[2]}, 0.5)` }} ></div>
        </div>
    );
}
