import * as React from 'react'
import ReactDom from 'react-dom'
import { Capture } from '../../components/components'
import { SetHeadImgService } from '../../net/net'
import { FileToDataUrl } from '../../common/tools'
import { User, WindowCommunicationData, WindowCommunicationType } from '../../net/model'
import { message } from 'antd'
import { useModal } from '../useModal'
import './setHeadImgModal.scss'

export interface IModalProps {
}

let me: User

export default function Modal(props: IModalProps) {

    const { closeModal } = useModal({ onInitData: data => { me = data.data.me } })

    function submitHeaderToSever(imgFile: File) {
        FileToDataUrl(imgFile, (dataUrl) => {
            let user: User = { id: me.id, headImg: dataUrl }
            SetHeadImgService(user, (res, err) => {
                err ? message.error('更新头像到服务器失败!') : (() => {
                    if (res.err) {
                        message.warning(res.err)
                        return
                    }
                    closeModal({ headImg: dataUrl })
                })()
            })
        })
    }

    return (
        <div className='modal-win'>

            <div className='close-window' onClick={() => { closeModal() }}><i className='fa fa-close' /></div>

            <div className='capture-area'>
                <Capture panelWidth={300} onCaptureSubmit={submitHeaderToSever} />
            </div>
        </div>
    );
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))
