import React, { useState } from 'react';
import './myButton.scss'
import chroma from 'chroma-js'

type buttonType = 'default' | 'frame' | 'circular'

export interface IMyButtonProps {
    type?: buttonType,
    buttonColor?: string,
    color?: string,
    padding?: string,
    onClick?: (e: ProgressEvent<HTMLButtonElement>) => {}
    children?: React.ReactNode,
    //...React.Component.prototype.props
}

export default function MyButton(props: IMyButtonProps) {


    const { type, buttonColor, color, padding, onClick, children } = props
    let style: React.CSSProperties = {}
    if (buttonColor) style = { backgroundColor: buttonColor, boxShadow: `0 2px 25px ${chroma(buttonColor).brighten(0.1).alpha(0.5)}` }
    if (type === 'frame') style = { borderColor: buttonColor }
    else if (type === 'circular') style = { ...style, minWidth: '45px', minHeight: '45px', borderRadius: '50px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }

    color ? style.color = color : (buttonColor && type === 'frame' ? style.color = buttonColor : null)
    padding ? style.padding = padding : null

    const [buttonType, setbuttonType] = useState<buttonType>(type ? type : 'default')

    function onMouseDownBut(e: ProgressEvent<HTMLButtonElement>) {
        if (!buttonColor) {
            return
        }
        if(type === 'frame'){
            e.target.style.borderColor = chroma(buttonColor).darken(0.3)
            e.target.style.color = `0 2px 25px ${chroma(buttonColor).darken(0.5).alpha(0.5)}`
        }
        else{
            e.target.style.backgroundColor = chroma(buttonColor).darken(0.3)
            e.target.style.boxShadow = `0 2px 25px ${chroma(buttonColor).darken(0.5).alpha(0.5)}`
        }
    }

    function onMouseUpBut(e: ProgressEvent<HTMLButtonElement>) {
        if (!buttonColor) {
            onClick ? onClick(e) : null
            return
        }
        type === 'default' ? (() => {
            e.target.style.backgroundColor = buttonColor
            e.target.style.boxShadow = `0 2px 25px ${chroma(buttonColor).brighten(0.1).alpha(0.5)}`
        })()
            : type === 'frame' ? (() => {
                e.target.style.borderColor = buttonColor
                e.target.style.color = buttonColor
            })() : null
        onClick ? onClick(e) : null
    }

    return (
        <button className={buttonType} style={{ ...style }} onMouseDown={onMouseDownBut} onClick={onMouseUpBut}>{children}</button>
    );
}
