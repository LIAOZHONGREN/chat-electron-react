import React, { useState, useRef, useEffect } from 'react';
import './myAudio.scss'

export interface IMyAudioProps {
    src?: string,
    name?: string
}

export default function MyAudio(props: IMyAudioProps) {

    const { src, name } = props
    const audio = useRef<HTMLAudioElement>()
    const turntable = useRef<HTMLDivElement>()
    const [progress, setprogress] = useState<number>(0)
    const [progress2, setprogress2] = useState<number>(0)
    const [isPlay, setisPlay] = useState<boolean>(false)
    const [duration, setduration] = useState<string>('')
    const [timer, settimer] = useState<string>('')
    const [timeOut, settimeOut] = useState<NodeJS.Timeout | null>(null)

    function onClickProgressBar(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.x
        audio.current.currentTime = audio.current.duration * x / 240
        setprogress(x / 240 * 100)
    }

    function onMouseMoveProgress(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.x
        setprogress2(x / 240 * 100)
    }

    function onMouseOutProgress() {
        setprogress2(0)
    }

    function onClickPlay() {
        timeOut ? clearInterval(timeOut) : null
        if (audio.current.paused) {
            const tiomeout = setInterval(() => {
                settimer(`${parseInt(audio.current.currentTime / 60)}:${parseInt(audio.current.currentTime % 60)}`)
                setprogress(audio.current.currentTime / audio.current.duration * 100)
            }, 1000)
            settimeOut(tiomeout)
            audio.current.play()
        } else {
            audio.current.pause()
        }
        setisPlay(!audio.current.paused)
    }

    function onCanPlay() {
        setduration(`${parseInt(audio.current.duration / 60)}:${parseInt(audio.current.duration % 60)}`)
        settimer(`${parseInt(audio.current.currentTime / 60)}:${parseInt(audio.current.currentTime % 60)}`)
        setprogress(audio.current.currentTime / audio.current.duration * 100)
    }

    function onEnded() {
        audio.current.currentTime = 0
        timeOut ? clearInterval(timeOut) : null
        setisPlay(false)
        setprogress(0)
        turntable.current.classList.remove('rotate')
        setTimeout(() => {
            turntable.current.classList.add('rotate')
        }, 100);
    }

    useEffect(() => {
        return () => { timeOut ? clearInterval(timeOut) : null }
    }, [timeOut])

    return (
        <div className='my-audio'>
            <audio src={src} ref={audio} onCanPlay={onCanPlay} onEnded={onEnded} />
            <div className={`audio-turntable rotate ${isPlay ? '' : 'paused'}`} ref={turntable}>
                <img width={'100%'} src={require('../../static/img/音符.png').default} alt="" />
            </div>
            <div className='audio-name'>{name}</div>
            <div className='audio-action'>
                <div className='audio-action-item' onClick={onClickPlay}>
                    <img style={isPlay ? { display: 'none' } : {}} width={20} src={require('../../static/img/播放.png').default} alt="" />
                    <img style={isPlay ? {} : { display: 'none' }} width={20} src={require('../../static/img/暂停.png').default} alt="" />
                </div>
                {/* <div className='audio-action-item audio-speed-control'>
                        <img width={18} src={require('../../static/img/速度.png').default} alt="" />
                        <div className='speed-show'></div>
                    </div> */}
            </div>
            <div className='audio-time-progress'>{timer}</div>
            <div className='audio-time'>{duration}</div>
            <div className='audio-progress-bar' onClick={onClickProgressBar} onMouseMove={onMouseMoveProgress} onMouseOut={onMouseOutProgress}>
                <div className='audio-progress2' style={{ width: `${progress2}%`, backgroundColor: '#fcffe6' }}></div>
                <div className='audio-progress' style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
}
