import React, { useState, useRef, useEffect } from 'react';
import './mySearch.scss'

export interface IMySearchProps {
    onSearch?: (value: string) => void,
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void,
    onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void,
    onClose?: () => void,
    active?: boolean,
    width?: number,
    placeholder: string,
    direction: 'left' | 'center' | 'right',
    size: 'large' | 'middle' | 'small'
    left: number,
    right: number,
}

export default function MySaerch(props: IMySearchProps) {

    const { onSearch, onBlur, onFocus, onClose, active, width, placeholder, direction, size, left, right } = props
    const holder = useRef<HTMLDivElement>()
    const [inputValue, setinputValue] = useState<string>('')
    const [wrapperStyle, setwrapperStyle] = useState((() => {
        let style: React.CSSProperties = {}
        direction === 'left' || !direction ? (left ? style.left = left : null) : (direction === 'right' ? (right ? style.right = right : null) : null)
        return style
    })())
    const [defaultWidth, setdefaultWidth] = useState<number>(size ? (size === 'large' ? 50 : (size === 'small' ? 35 : 40)) : 40)

    function searchToggle(e: ProgressEvent<HTMLButtonElement | HTMLSpanElement>) {

        const container = e.target.closest('.search-wrapper')
        if (!container.classList.contains('active')) {
            container.classList.add('active')
            width ? holder.current.style.width = `${width}px` : null
            e.preventDefault()
        }
        else if (container.classList.contains('active') && e.target.closest('.input-holder') === null) {
            container.classList.remove('active')
            width ? holder.current.style.width = `${defaultWidth}px` : null
            if (onClose) onClose()
            setinputValue('')
        } else {
            if (onSearch) onSearch(inputValue)
        }
    }

    useEffect(() => {
        if (active) {
            width ? holder.current.style.width = `${width}px` : null
            holder.current.closest('.search-wrapper').classList.add('active')
        }
        return () => { }
    }, [])

    return (
        <div className={`search-wrapper ${direction ? direction : 'left'}`} style={wrapperStyle}>
            <div className={`input-holder ${size ? size : 'middle'}`} ref={holder}>
                <input onBlur={onBlur} onFocus={onFocus} type="text" className={`search-input ${size ? size : 'middle'}`} placeholder={placeholder ? placeholder : '让我来帮你找!'} value={inputValue} onChange={(e) => { setinputValue(e.target.value) }} />
                <button className={`search-icon ${size ? size : 'middle'}`} onClick={searchToggle}><span></span></button>
            </div>
            <span className={`close ${size ? size : 'middle'}`} onClick={searchToggle}></span>
        </div>
    );
}
