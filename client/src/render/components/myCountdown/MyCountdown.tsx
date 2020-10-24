import React, { useEffect, useRef, useState } from 'react'
import './myCountDown.scss'

export interface IMyCountdownProps {
    second: number,
    size: 'large' | 'middle' | 'small',
    onComplete: () => void
}

export default function MyCountdown(props: IMyCountdownProps) {

    const { second, size, onComplete } = props
    const [num, setnum] = useState<number | string>('00')

    function countdown(num: number) {
        setTimeout(() => {
            if (num > 0) {
                setnum(num--)
                countdown(num)
            } else {
                setnum('00')
                onComplete ? onComplete() : null
            }
        }, 1000);
    }

    useEffect(() => {
        countdown(second - 1)
        return () => { }
    }, [])

    return (
        <div className={`my-countdown ${size ? size : 'middle'}`}>
            <div style={{ position: 'relative', width: '100px', height: '45px', overflow: 'hidden', marginBottom: '3px' }}>
                <div className='num-head'>{num}</div>
            </div>
            <div className='tail' style={{ position: 'relative', width: '100px', height: '45px', overflow: 'hidden' }}>
                <div className='num-tail'>{num}</div>
            </div>
        </div>
    )
}
