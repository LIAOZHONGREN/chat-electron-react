import React, { useRef, useState } from 'react'
//import ReactDom from 'react-dom'
import { MyButton, MyInput } from '../../components/components'
import { Space } from 'antd'
import '../../static/scss/main.scss'
import './videoCallModal.scss'

export interface IModalProps {
}

const mediaStreamConstraints = { video: true, }
const offerOptions = { offerToReceiveVideo: 1, }
let startTime: number = null
let localStream: MediaStream
let remoteStream: MediaStream
let localPeerConnection: RTCPeerConnection
let remotePeerConnection: RTCPeerConnection

let sendChannel: RTCDataChannel;
let receiveChannel: RTCDataChannel;
let pcConstraint: RTCDataChannelInit;
let dataConstraint: RTCDataChannelInit;

export default function Modal(props: IModalProps) {

    const video = useRef<HTMLVideoElement>()
    const video2 = useRef<HTMLVideoElement>()
    const [value, setvalue] = useState<string>('')
    const [value2, setvalue2] = useState<string>('')

    //获取本地媒体流数据
    function gotLocalMediaStream(mediaStream: MediaStream) {
        video.current.srcObject = mediaStream
        localStream = mediaStream
    }

    function gotRemoteMediaStream(event: MediaStreamEvent) {
        const mediaStream = event.stream
        video2.current.srcObject = mediaStream
        remoteStream = mediaStream
        console.log('ok')
    }

    //获取对方连接
    function getOtherPeer(peerConnection: RTCPeerConnection) {
        return (peerConnection === localPeerConnection) ?
            remotePeerConnection : localPeerConnection
    }

    function handleConnection(event: RTCPeerConnectionIceEvent) {
        const peerConnection = event.target
        const iceCandidate = event.candidate
        if (iceCandidate) {
            const newIceCandidate = new RTCIceCandidate(iceCandidate)
            const otherPeer = getOtherPeer(peerConnection)
            otherPeer.addIceCandidate(newIceCandidate)
                .then(() => {
                    console.log(otherPeer === localPeerConnection ? 'localPeerConnection' : 'remotePeerConnection')
                }).catch((error) => {
                    console.log(error)
                })
        }
    }

    function createdAnswer(description: RTCSessionDescriptionInit) {

        remotePeerConnection.setLocalDescription(description)
            .then(() => {
            }).catch(err => { console.log(err) })

        localPeerConnection.setRemoteDescription(description)
            .then(() => {
            }).catch(err => { console.log(err) })
    }

    function createdOffer(description: RTCSessionDescriptionInit) {

        localPeerConnection.setLocalDescription(description)
            .then(() => {

            }).catch(err => { console.log(err) })

        remotePeerConnection.setRemoteDescription(description)
            .then(() => {
            }).catch(err => { console.log(err) })

        remotePeerConnection.createAnswer()
            .then(createdAnswer)
            .catch(err => { console.log(err) })
    }

    function startAction() {
        navigator.mediaDevices.getUserMedia(mediaStreamConstraints).then(gotLocalMediaStream).catch(err => { console.log(err) })
    }

    function callAction() {

        startTime = window.performance.now()

        // Get local media stream tracks.
        const videoTracks = localStream.getVideoTracks()
        const audioTracks = localStream.getAudioTracks()

        if (videoTracks.length > 0) {
            console.log(`Using video device: ${videoTracks[0].label}.`)
        }
        if (audioTracks.length > 0) {
            console.log(`Using audio device: ${audioTracks[0].label}.`)
        }

        const servers = null  // Allows for RTC server configuration.

        // Create peer connections and add behavior.
        localPeerConnection = new RTCPeerConnection(servers)
        localPeerConnection.addEventListener('icecandidate', handleConnection)
        localPeerConnection.addEventListener('iceconnectionstatechange', ev => {
            // console.log('ICE state change event: ', event)
            console.log(`localPeerConnection ICE state: ` + `${ev.target.iceConnectionState}.`)
        })

        remotePeerConnection = new RTCPeerConnection(servers)
        remotePeerConnection.addEventListener('icecandidate', handleConnection)
        remotePeerConnection.addEventListener('iceconnectionstatechange', ev => {
            // console.log('ICE state change event: ', event)
            console.log(`remotePeerConnection ICE state: ` + `${ev.target.iceConnectionState}.`)
        })
        remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream)

        // Add local stream to connection and create offer to connect.
        localPeerConnection.addStream(localStream)
        localPeerConnection.createOffer(offerOptions).then(createdOffer).catch(err => { console.log(err) })
    }

    function hangupAction() {
        localPeerConnection.close()
        remotePeerConnection.close()
        localPeerConnection = null
        remotePeerConnection = null
    }

    function gotDescription2(desc: RTCSessionDescriptionInit) {
        remotePeerConnection.setLocalDescription(desc);
        localPeerConnection.setRemoteDescription(desc);
    }

    function gotDescription1(desc: RTCSessionDescriptionInit) {
        localPeerConnection.setLocalDescription(desc);
        remotePeerConnection.setRemoteDescription(desc);
        remotePeerConnection.createAnswer().then(
            gotDescription2,
            err => { console.log(err) }
        );
    }

    function receiveChannelCallback(event: RTCDataChannelEvent) {
        receiveChannel = event.channel;
        receiveChannel.onmessage = (ev: MessageEvent<any>) => { setvalue2(ev.data) };
        receiveChannel.onopen = () => { console.log('onopen:', receiveChannel.readyState) };
        receiveChannel.onclose = () => { console.log('onclose:', receiveChannel.readyState) };
    }

    function iceCallback1(event: RTCPeerConnectionIceEvent) {
        if (event.candidate) {
            remotePeerConnection.addIceCandidate(event.candidate).then(() => { }, err => { console.log(err) })
        }
    }

    function iceCallback2(event: RTCPeerConnectionIceEvent) {
        if (event.candidate) {
            localPeerConnection.addIceCandidate(event.candidate).then(() => { }, err => { console.log(err) })
        }
    }

    function createConnection() {
        setvalue('')
        let servers = null;
        pcConstraint = null;
        dataConstraint = null;
        localPeerConnection = new RTCPeerConnection(servers, pcConstraint);
        sendChannel = localPeerConnection.createDataChannel('sendDataChannel', dataConstraint)
        localPeerConnection.onicecandidate = iceCallback1;
        sendChannel.onopen = () => { console.log('onopen:', sendChannel.readyState) };
        sendChannel.onclose = () => { console.log('onclose:', sendChannel.readyState) };

        remotePeerConnection = new RTCPeerConnection(servers, pcConstraint);
        remotePeerConnection.onicecandidate = iceCallback2;
        remotePeerConnection.ondatachannel = receiveChannelCallback;

        localPeerConnection.createOffer().then(gotDescription1, err => { console.log(err) })
    }

    function closeDataChannels() {
        sendChannel.close();
        receiveChannel.close();
        localPeerConnection.close();
        remotePeerConnection.close();
        localPeerConnection = null;
        remotePeerConnection = null;
        setvalue('')
        setvalue2('')
    }

    function sendData() {
        sendChannel.send(value)
    }

    

    return (
        <div className='video-call'>
            <Space direction='horizontal'>
                <video ref={video} width={250} height={250} autoPlay />
                <video ref={video2} width={250} height={250} autoPlay />
            </Space>
            <Space direction='horizontal'>
                <MyInput width={250} height={50} value={value} onChange={v => { setvalue(v) }} />
                <MyInput width={250} height={50} value={value2} onChange={v => { setvalue2(v) }} />
            </Space>
            <div style={{ display: 'inline-block', position: 'absolute', bottom: 0, right: 0 }}>
                <MyButton onClick={createConnection}>开启</MyButton>
                <MyButton onClick={sendData}>call</MyButton>
                <MyButton onClick={closeDataChannels}>关闭</MyButton>
            </div>
        </div>
    )
}

//(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))