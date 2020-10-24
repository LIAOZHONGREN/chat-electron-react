import React, { useEffect, useState, useMemo, useLayoutEffect, useRef } from 'react';
import ReactDom from 'react-dom'
import '../../static/scss/main.scss'
import './callerIDModal.scss'
import { MyButton, MyList } from '../../components/components'
import { Space, Avatar } from 'antd';
import { CloseWindow } from '../../common/electronTool'
import { CallData, CallState, CallType, User, WindowCommunicationData, WindowCommunicationType } from '../../net/model';
import { DeepCopy } from '../../common/tools';
import { remote } from 'electron'
import { useModal } from '../useModal'

export interface IModalProps {
}

const win = remote.getCurrentWindow()
const { y, height } = win.getBounds()
const [startY, startH] = [y, height]
let callerIDCount = 0
const callAudio = new Audio(require('../../static/sound/来电提示音.mp3').default)

export default function Modal(props: IModalProps) {

    const list = useRef()
    const [callerAndCallDataArr, setcallerAndCallDataArr] = useState<{ caller: User, callData: CallData<any> }[]>([])
    const { closeModal, sendData } = useModal({
        onInitData: data => {
            callerAndCallDataOnChange(data.data)
            callAudio.play()
        },
        onWindowCommunication: data => {
            const callData: CallData<any> = data.data
            if (callData.state == CallState.hangUp) callerAndCallDataOnChange({ callData: callData })
        }
    })

    function hangUp(index: number) {
        const value = DeepCopy(callerAndCallDataArr[index])
        const wcd: WindowCommunicationData = { type: WindowCommunicationType.communication, data: { isHangUp: true, caller: value.caller, callData: value.callData } as { isHangUp: boolean, caller: User, callData: CallData<any> } }
        sendData(wcd)
        setcallerAndCallDataArr(callerAndCallDataArr => {
            callerAndCallDataArr.splice(index, 1)
            return [...callerAndCallDataArr]
        })
    }

    function connect(index: number) {
        const value = DeepCopy(callerAndCallDataArr[index])
        const wcd: WindowCommunicationData = { type: WindowCommunicationType.communication, data: { isHangUp: false, caller: value.caller, callData: value.callData } as { isHangUp: boolean, caller: User, callData: CallData } }
        sendData(wcd)
        let newCallerAndCallDataArr = [...callerAndCallDataArr]
        newCallerAndCallDataArr.splice(index, 1)
        setcallerAndCallDataArr(newCallerAndCallDataArr)
    }

    function callerAndCallDataOnChange(callerAndCallData: { caller?: User, callData: CallData<any> }) {
        setcallerAndCallDataArr(callerAndCallDataArr => {
            const index = callerAndCallDataArr.findIndex(v => (v.caller.id === callerAndCallData.callData.callerId && v.callData.type == callerAndCallData.callData.type))
            if (index === -1 && callerAndCallData.callData.state != CallState.hangUp) {
                callerAndCallDataArr.push(DeepCopy(callerAndCallData))
            } else if (callerAndCallData.callData.state == CallState.hangUp && index > -1) {
                callerAndCallDataArr.splice(index, 1)
            }
            return callerAndCallDataArr.length === 0 ? [] : [...callerAndCallDataArr]
        })
    }

    useLayoutEffect(() => {
        if (callerAndCallDataArr.length >= callerIDCount) list.current.goBottom()
        if (callerAndCallDataArr.length >= 3 && callerAndCallDataArr.length <= 5) {
            const increasedHeight = (callerAndCallDataArr.length - 3) * 67
            win.setBounds({ height: startH + increasedHeight, y: startY - increasedHeight }, true)
        }
        if (callerAndCallDataArr.length == 0 && callerIDCount !== 0) closeModal()
        callerIDCount = callerAndCallDataArr.length
    }, [callerAndCallDataArr])

    return (
        <div className='caller-ID'>
            <MyList ref={list} width='100%' height='100%'>
                {
                    callerAndCallDataArr.map((v, i) => (
                        <div className={`caller-ID-item index-${callerAndCallDataArr.length >= 3 ? 3 : callerAndCallDataArr.length}`} key={v.caller.id + v.callData.type}>
                            <div className='headimg-and-name'>
                                <Avatar size={callerAndCallDataArr.length === 1 ? 80 : 40} src={v.caller.headImg} className='headimg'>{v.caller.name}</Avatar>
                                <div className='name'>{v.caller.name}</div>
                            </div>
                            <Space direction='horizontal' align='center' className='handle-buts' size={20}>
                                <MyButton onClick={() => { hangUp(i) }} type='circular' buttonColor='#f5222d' color='#fff'><i className='fa fa-times fa-2x' /></MyButton>
                                <MyButton onClick={() => { connect(i) }} type='circular' buttonColor='#a0d911' color='#fff'>
                                    {
                                        v.callData.type == CallType.voice ? <i className='fa fa-volume-control-phone fa-2x' /> : <img width={25} className='fa-volume-control-phone' src={require('../../static/img/视频通话.png').default} alt="" />
                                    }
                                </MyButton>
                            </Space>
                        </div>
                    ))
                }
            </MyList>
        </div>
    );
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))