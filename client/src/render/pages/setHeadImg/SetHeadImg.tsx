import * as React from 'react';
import { Capture, Nav, MyButton } from '../../components/components'
import { User } from '../../net/model'
import { FileToDataUrl } from '../../common/tools'
import store from '../../redux/index'
import { SetHeadImgService } from '../../net/net'
import { message } from 'antd'
import { UpdataUser } from '../../redux/actionCreator'
import { useHistory } from 'react-router-dom'
import { LoginSuccessAction } from '../../common/loginSuccessAction'

export interface ISetHeadImgProps {
}

export default function SetHeadImg(props: ISetHeadImgProps) {

    let history = useHistory()
    function submitHeaderToSever(imgFile: File) {
        FileToDataUrl(imgFile, (dataUrl) => {
            let state = store.getState()
            let user: User = { id: state.user.id, headImg: dataUrl }
            SetHeadImgService(user, (res, err) => {
                err ? message.error('更新头像到服务器失败!') : (() => {
                    if (res.err) {
                        message.warning(res.err)
                        return
                    }
                    store.dispatch(UpdataUser(res.data as User))
                    LoginSuccessAction(history)
                })()
            })
        })
    }

    function netSetHeadImg() {
        LoginSuccessAction(history)
    }

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <Nav />
            <div style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center' }}>
                <Capture onCaptureSubmit={submitHeaderToSever} />
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '10px', width: '100%', display: 'flex', flexDirection: 'row-reverse' }}>
                <MyButton onClick={netSetHeadImg}>下次再设置</MyButton>
            </div>
        </div>
    );
}
