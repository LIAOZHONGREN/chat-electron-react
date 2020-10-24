import React, { useRef, useState, useEffect, useMemo } from 'react'
import ReactDom from 'react-dom'
import { MyButton, MyInput } from '../../components/components'
import { Space, message } from 'antd'
import '../../static/scss/main.scss'
import './videoCallModal.scss'
import { User, CallState, CallData, WindowCommunicationData, WindowCommunicationType, CallType } from '../../net/model'
import { SocketEmitData } from '../../net/model'
import { useModal } from '../useModal'
import { remote } from 'electron'
import { MinWindow, MaxWindow } from '../../common/electronTool'

export interface IModalProps {
}


//const constraints: MediaStreamConstraints = { video: { width: { min: 960, max: 1920 }, height: { min: 540, max: 1080 }, frameRate: { ideal: 60, min: 10 } }, audio: { echoCancellation: true, facingMode: true, noiseSuppression: true } }

const constraints: MediaStreamConstraints = { video: { width: { min: 960, max: 1920 }, height: { min: 540, max: 1080 }, frameRate: { ideal: 60, min: 10 } }, audio: { echoCancellation: true, facingMode: true, noiseSuppression: true, autoGainControl: true } }
let coreData: { me: User, caller: User, callData?: CallData<any> }
let pc: RTCPeerConnection
let bounds: Electron.Rectangle
let dialingTimeout = null
let candidates: RTCIceCandidateInit[] = []
const dialingAudio = new Audio(require('../../static/sound/拨号.mp3').default)

export default function Modal(props: IModalProps) {

    const root = useRef<HTMLDivElement>()
    const video = useRef<HTMLVideoElement>()
    const video2 = useRef<HTMLVideoElement>()
    const [currentCallState, setcurrentCallState] = useState(CallState.call)
    const [isFullScreen, setisFullScreen] = useState(false)
    const [isMaxSreen, setisMaxSreen] = useState(false)
    const { closeModal, sendData } = useModal({
        onCloseModal: () => {
            setcurrentCallState(currentCallState => {
                if (currentCallState !== CallState.hangUp) hangUp()
                return CallState.hangUp
            })
            if (dialingTimeout) clearTimeout(dialingTimeout)
            dialingAudio.pause()
        },
        onInitData: (data) => {
            coreData = data.data
            if (coreData.callData) {
                answer()
                const value: CallData<any> = coreData.callData
                handle(value.data.type, value.data)
                setcurrentCallState(CallState.communication)
            } else {
                offer()
                dialingAudio.loop = true
                dialingAudio.play()//播放拨号音
                //设置拨号超时
                dialingTimeout = setTimeout(() => { otherHangUpHandle('拨号超时!对方可能未听到来电提示或未在线.') }, 30000);
            }
        },
        onWindowCommunication: (data) => {
            if (data.data.state == CallState.call) {
                answer()
                const value: CallData<any> = data.data
                handle(value.data.type, value.data)
            } else if (data.data.state == CallState.communication) {
                const value: CallData<RTCSessionDescriptionInit> = data.data
                handle(value.data.type, value.data)
            } else {
                setcurrentCallState(CallState.hangUp)
                otherHangUpHandle('对方已挂断')
            }
        }
    })


    function onIceCandidate(ev: RTCPeerConnectionIceEvent) {
        if (ev.candidate) {
            candidates.push(ev.candidate.toJSON())
        }
    }

    function onIceconnectionstatechange(ev: Event) {
        if (ev.target.iceConnectionState === 'closed') setcurrentCallState(CallState.hangUp)
    }

    function onConnectionstatechange(ev: Event) {
        if (pc.connectionState === 'disconnected') {
            setcurrentCallState(CallState.hangUp)
            otherHangUpHandle('对方已挂断')
        }
        else if (pc.connectionState === 'connected') {
            clearTimeout(dialingTimeout)
            setcurrentCallState(CallState.communication)
            dialingAudio.pause()
            root.current.classList.remove('show-call-control-col')
            setMainScreen(video2.current)
        }
    }

    function onTrack(ev: RTCTrackEvent) {
        if (video2.current.srcObject) {
            video2.current.srcObject.addTrack(ev.track)
            return
        }
        if (ev.streams && ev.streams[0]) {
            video2.current.srcObject = ev.streams[0]
        } else {
            const inboundStream = new MediaStream();
            video2.current.srcObject = inboundStream;
            inboundStream.addTrack(ev.track);
        }
    }

    async function offer() {
        try {
            pc = new RTCPeerConnection(null)
            pc.onicecandidate = onIceCandidate
            pc.onnegotiationneeded = async () => {
                try {
                    if (pc.signalingState === 'stable') {
                        const localDescription = await pc.createOffer()
                        await pc.setLocalDescription(localDescription)
                        const data = { addresseeId: coreData.caller.id, data: { type: CallType.video, state: CallState.call, callerId: coreData.me.id, data: pc.localDescription } as CallData } as SocketEmitData
                        const wcd: WindowCommunicationData = { type: WindowCommunicationType.communication, data: JSON.stringify(data) }
                        sendData(wcd)
                    }
                } catch (err) {
                    console.log(err)
                }
            }
            pc.oniceconnectionstatechange = onIceconnectionstatechange
            pc.onconnectionstatechange = onConnectionstatechange
            pc.ontrack = onTrack
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
            // const audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints)
            //   audioStream.getTracks().forEach(t => { mediaStream.addTrack(t) })
            mediaStream.getTracks().forEach(t => { pc.addTrack(t) })
            video.current.srcObject = mediaStream
        } catch (err) {
            console.log(err)
        }
    }

    async function answer() {
        try {
            pc = new RTCPeerConnection(null)
            pc.onicecandidate = onIceCandidate
            pc.oniceconnectionstatechange = onIceconnectionstatechange
            pc.onconnectionstatechange = onConnectionstatechange
            pc.ontrack = onTrack
        } catch (err) {
            console.log(err)
        }
    }

    //对方挂断,或拨号超时的处理函数
    function otherHangUpHandle(info: string) {
        setcurrentCallState(currentCallState => {
            if (currentCallState !== CallState.hangUp) hangUp()
            return CallState.hangUp
        })
        if (dialingTimeout) clearTimeout(dialingTimeout)
        dialingAudio.pause()
        message.info(info)
        setTimeout(() => { closeModal() }, 2000);
    }

    function hangUp() {
        const wcd: WindowCommunicationData = { type: WindowCommunicationType.communication, data: { addresseeId: coreData.caller.id, data: { type: CallType.video, state: CallState.hangUp, callerId: coreData.me.id, data: null } as CallData<any> } as SocketEmitData }
        sendData(wcd)
        if (pc) {
            pc.close()
            pc = null
        }
        setcurrentCallState(CallState.hangUp)
    }

    function sendCandidates() {
        if (candidates.length > 0) {
            candidates.forEach(v => {
                const data = { addresseeId: coreData.caller.id, data: { type: CallType.video, state: CallState.communication, callerId: coreData.me.id, data: { type: 'candidate', candidate: v } } as CallData<any> } as SocketEmitData
                const wcd: WindowCommunicationData = { type: WindowCommunicationType.communication, data: JSON.stringify(data) }
                sendData(wcd)
            })
            candidates = []
        }
    }

    async function handle(type: 'offer' | 'answer' | 'candidate', value: RTCSessionDescriptionInit | { candidate: any }) {
        if (type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(value));
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStream.getTracks().forEach(t => { pc.addTrack(t, mediaStream) });
            video.current.srcObject = mediaStream
            const localDescription = await pc.createAnswer()
            await pc.setLocalDescription(localDescription)
            const data = { addresseeId: coreData.caller.id, data: { type: CallType.video, state: CallState.communication, callerId: coreData.me.id, data: pc.localDescription } as CallData<RTCSessionDescriptionInit> } as SocketEmitData
            const wcd: WindowCommunicationData = { type: WindowCommunicationType.communication, data: JSON.stringify(data) }
            sendData(wcd)
        }
        else if (type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(value))
            sendCandidates()
            setcurrentCallState(CallState.communication)
        }
        else if (type === 'candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(value.candidate))
            sendCandidates()
        } else {
            console.log('Unsupported SDP type.');
        }
    }

    function setMainScreen(videoEle: HTMLVideoElement) {

        if (!videoEle.classList.contains('main-screen')) {
            videoEle.classList.add('main-screen')
        }
        const v = videoEle === video.current ? video2 : video
        v.current.classList.remove('main-screen')
    }

    //最大化窗口或还原窗口
    function maxWindowOrRestore() {
        if (!isMaxSreen) {
            bounds = remote.getCurrentWindow().getBounds()
            MaxWindow(!isMaxSreen)
        } else {
            MaxWindow(!isMaxSreen)
            remote.getCurrentWindow().setBounds(bounds, true)
        }
        setisMaxSreen(!isMaxSreen)
    }

    //全屏
    function onFullScreen() {
        const isFullScreen_ = !isFullScreen
        remote.getCurrentWindow().setFullScreen(isFullScreen_)
        if (isFullScreen_) {
            remote.getCurrentWindow().setBounds({ width: screen.width, height: screen.height })
        }
        if (!isFullScreen_ && isMaxSreen) {
            maxWindowOrRestore()
        }
        setisFullScreen(isFullScreen_)
    }

    //用于控制控件的显示和消失
    function onMouseMove(currentCallState: CallState) {
        let currentDate = Date.now()
        let timeout = null
        return (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            if (currentCallState == CallState.call) return
            if (Date.now() - currentDate > 1000) {
                if (!e.currentTarget.classList.contains('show-call-control-col')) e.currentTarget.classList.add('show-call-control-col')
                timeout ? clearTimeout(timeout) : null
                timeout = setTimeout(() => {
                    root.current.classList.remove('show-call-control-col')
                }, 8000);
                currentDate = Date.now()
            }
        }
    }

    const onmousermove = useMemo(() => {
        return onMouseMove(currentCallState)
    }, [currentCallState])

    return (
        <div className='video-call show-call-control-col' onMouseMove={onmousermove} ref={root}>
            <div className='no-dragging'></div>
            <video className='local-video main-screen' ref={video} onClick={() => { setMainScreen(video.current) }} autoPlay={true} />
            <video className='remote-video' ref={video2} onClick={() => { setMainScreen(video2.current) }} autoPlay={true} />
            <div className='call-control-col'>
                <table>
                    <tbody>
                        <tr>
                            <td><MyButton onClick={() => { closeModal() }} type='circular' buttonColor='#f5222d' color='#fff'><i className='fa fa-times fa-1x' /></MyButton></td>
                            <td onClick={maxWindowOrRestore}><i className={`fa fa-${isMaxSreen ? 'compress' : 'expand'}`} /></td>
                            <td onClick={onFullScreen}>{isFullScreen ? '还原' : '满屏'}</td>
                            <td onClick={MinWindow}><i className='fa fa-window-minimize' /></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))