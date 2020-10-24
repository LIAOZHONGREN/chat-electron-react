import React, { useState, useRef, useEffect } from 'react';
import './loading.scss'

export interface ILoadingProps {
    text?: string,
    color?: string,
    size?: number,
    loading: boolean,
    fullScreen?: boolean,
    mask?: boolean
}

export default function Loading(props: ILoadingProps) {
    const { text, color, size, loading, fullScreen, mask } = props
    const [words, setwords] = useState<string[]>(text ? text.split('').reverse() : 'GNIDAOL'.split(''))
    const load = useRef<HTMLDivElement>()

    useEffect(() => {
        setwords(text ? text.split('').reverse() : 'GNIDAOL'.split(''))
        return () => { }
    }, [text])

    useEffect(() => {
        load.current.childNodes.forEach((child: HTMLDivElement, index: number) => {
            child.style.animationDelay = `${0.2 + index * 0.2}s`
        })
        return () => { }
    }, [loading])

    return (
        <div className={`loading ${fullScreen === undefined || fullScreen ? 'full' : ''} ${mask === undefined || mask ? 'mask' : ''}`} style={{ display: loading ? 'block' : 'none' }}>

            <div className='load' style={{ color: color ? color : '#35c4f0', fontSize: size ? `${size}px` : '13px' }} ref={load}>
                {
                    loading ? (
                        words.map((item, index) => {
                            return (
                                <div key={index}>{item}</div>
                            )
                        })
                    ) : null
                }
            </div>
        </div>
    );
}
