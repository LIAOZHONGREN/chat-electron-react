import React, { useState, useRef, useEffect } from 'react'
import './myInput.scss'

export type OnChange = (value: string) => void
export interface IMyInputProps {
    width?: string,
    height?: string,
    placeholder?: string,
    value?: string,
    onChange?: OnChange,
    wordLimit?: number,
    focus?: boolean,
}

export default function MyInput(props: IMyInputProps) {

    const { width, height, placeholder, value, onChange, wordLimit, focus } = props
    const [measure, setmeasure] = useState<string>('')
    const measureRef = useRef<HTMLDivElement>()
    const textareaRef = useRef<HTMLTextAreaElement>()

    var firstH = 0
    function change(e: React.ChangeEvent<HTMLTextAreaElement>) {

        //输入字数控制
        if (wordLimit) {
            if (e.target.value.length > wordLimit) {
                e.target.value = e.target.value.substr(0, wordLimit)
            }
        }
        if (onChange) {
            onChange(e.target.value)
        }
        if (height) return
        setmeasure(e.target.value)
        e.target.style.height = measureRef.current.offsetHeight + 'px'
    }

    useEffect(() => {
        focus ? textareaRef.current.focus() : null
        return () => { }
    }, [])

    return (
        <div style={{ position: 'relative' }}>
            {
                //用于测量高度
            }
            <div className='measure' style={{ width: width }} ref={measureRef}>{measure}</div>
            <textarea className='my-input' ref={textareaRef} placeholder={placeholder} value={value} onChange={change} style={{ width: width, height: height }} />
        </div>
    )
}

