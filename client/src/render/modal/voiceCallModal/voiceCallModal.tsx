import React, { useState, useRef, useEffect } from 'react';
import ReactDom from 'react-dom'
import { MyButton, MyInput } from '../../components/components'
import { Space, Avatar, message } from 'antd'
import { User, CallState, CallData, WindowCommunicationData, WindowCommunicationType, CallType } from '../../net/model'
import { SocketEmitData } from '../../net/model'
import { useModal } from '../useModal'
import { remote } from 'electron'
import { RefreshVolume } from './refreshVolume'
import { round } from 'lodash'
import '../../static/scss/main.scss'
import './voiceCallModal.scss'

export interface IModalProps {
}

const constraints: MediaStreamConstraints = { audio: { echoCancellation: true, facingMode: true, noiseSuppression: true, autoGainControl: true } }
let coreData: { me: User, caller: User, callData?: CallData<any> }
let pc: RTCPeerConnection
let candidates: RTCIceCandidateInit[] = []
let dialingTimeout = null
const dialingAudio = new Audio(require('../../static/sound/拨号.mp3').default)

export default function Modal(props: IModalProps) {

    const audio = useRef<HTMLAudioElement>()
    const [caller, setcaller] = useState<User>(null)
    const [instantVolume, setinstantVolume] = useState(0)
    const [currentCallState, setcurrentCallState] = useState(CallState.call)
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
            setcaller(coreData.caller)
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
            if (window.stop) window.stop()
            setcurrentCallState(CallState.hangUp)
            otherHangUpHandle('对方已挂断')
        }
        else if (pc.connectionState === 'connected') {
            clearTimeout(dialingTimeout)
            setcurrentCallState(CallState.communication)
            dialingAudio.pause()
        }
    }

    function onTrack(ev: RTCTrackEvent) {
        let stream: MediaStream
        if (ev.streams && ev.streams[0]) {
            stream = ev.streams[0]
        } else {
            stream = new MediaStream()
            stream.addTrack(ev.track)
        }
        audio.current.srcObject = stream
        window.stop = RefreshVolume(stream, (instant) => { setinstantVolume(round(instant * 2, 2)) }, 500)
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
                        const data = { addresseeId: coreData.caller.id, data: { type: CallType.voice, state: CallState.call, callerId: coreData.me.id, data: pc.localDescription } as CallData } as SocketEmitData
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
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStream.getTracks().forEach(t => { pc.addTrack(t) })
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
        const wcd: WindowCommunicationData = { type: WindowCommunicationType.communication, data: { addresseeId: coreData.caller.id, data: { type: CallType.voice, state: CallState.hangUp, callerId: coreData.me.id, data: null } as CallData<any> } as SocketEmitData }
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
                const data = { addresseeId: coreData.caller.id, data: { type: CallType.voice, state: CallState.communication, callerId: coreData.me.id, data: { type: 'candidate', candidate: v } } as CallData<any> } as SocketEmitData
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
            const localDescription = await pc.createAnswer()
            await pc.setLocalDescription(localDescription)
            const data = { addresseeId: coreData.caller.id, data: { type: CallType.voice, state: CallState.communication, callerId: coreData.me.id, data: pc.localDescription } as CallData<RTCSessionDescriptionInit> } as SocketEmitData
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

    return (
        <div className='voice-call'>
            <audio ref={audio} autoPlay={true} />
            {
                caller ? (
                    <div className='headimg-and-name'>
                        <Avatar size={80} src={caller.headImg} className='headimg'>{caller.name}</Avatar>
                        <div className='name'>{caller.name}</div>
                    </div>
                ) : null
            }
            <div className='volume'>
                <div className={`one ${instantVolume >= 0.25 ? 'show' : 0}`}></div>
                <div className={`two ${instantVolume >= 0.5 ? 'show' : 0}`}></div>
                <div className={`three ${instantVolume >= 0.75 ? 'show' : 0}`}></div>
                <div className={`four ${instantVolume >= 0.88 ? 'show' : 0}`}></div>
            </div>
            <Space direction='horizontal' align='center' className='handle-buts' size={20}>
                <MyButton onClick={() => { closeModal() }} type='circular' buttonColor='#f5222d' color='#fff'><i className='fa fa-times fa-2x' /></MyButton>
            </Space>
        </div>
    );
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))