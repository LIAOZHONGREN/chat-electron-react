import React, { useRef, useEffect, useState } from 'react';
import './myModal.scss'
import { MyButton } from '../components'

type showType = 'unfolding' | 'revealing' | 'uncovering' | 'blowUp' | 'meepMeep' | 'sketch' | 'bond'
type modalType = 'tips' | 'error' | 'warn'

export interface IMyModalProps {
    type?: modalType
    showType: showType,
    visible?: boolean,
    text?: string
    onCancel: (visible: boolean, isOK?: boolean) => void,
    onOk?: (e: boolean) => void,
    content?: React.ReactNode,
    children?: React.ReactNode,
}

export default function MyModal(props: IMyModalProps) {

    const { type, showType, visible, text, onCancel, onOk, content, children } = props
    const [out, setout] = useState<boolean>(true)
    const [modalType, setmodalType] = useState<modalType>(type ? type : 'tips')
    const [showTypeSta, setshowTypeSta] = useState<showType | string>('')


    function visibleModal() {
        setshowTypeSta(showType)
        setout(false)
    }

    function closeModal() {
        setshowTypeSta(showType + ' out')
        setout(true)
        onCancel(false, false)
    }

    function clockOk() {
        setshowTypeSta(showType + ' out')
        setout(true)
        onCancel(false, true)
        onOk ? onOk(false) : null
    }

    useEffect(() => {
        visible ? visibleModal() : (out ? null : closeModal())
        return () => { }
    }, [visible])

    return (
        <div id='my-modal'>
            <div id="modal-container" className={(showTypeSta as string)}>
                <div className="modal-background">
                    <div className='mask' onClick={closeModal}></div>
                    <div className="modal">
                        <svg className="modal-svg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
                            <rect x="0" y="0" fill="none" width="100%" height="100%" rx="3" ry="3"></rect>
                        </svg>
                        {visible ?
                            (content ? content : (
                                <div>
                                    <div className='tips'>
                                        {
                                            modalType === 'tips' ? <img width={35} src={require('../../static/svg/提示信息.svg').default} alt="" />
                                                : (modalType === 'error' ? <img width={35} src={require('../../static/svg/错误.svg').default} alt="" />
                                                    : <img width={35} src={require('../../static/svg/警告.svg').default} alt="" />)
                                        }
                                    </div>
                                    <p>{text ? text : ''}</p>
                                    <div className='buts'>
                                        <MyButton buttonColor='#40a9ff' onClick={clockOk}>确认</MyButton>
                                        <MyButton buttonColor='#d3f261' onClick={closeModal}>取消</MyButton>
                                    </div>
                                </div>
                            )) : null
                        }
                    </div>
                </div>
            </div>
            <div className="content">
                {children}
            </div>
        </div>
    )
}

