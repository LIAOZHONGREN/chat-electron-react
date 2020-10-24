
import store from '../../redux/index'
import { UpdateChats, UpdateChatFileSendingProgress, UpdateChatMsg } from '../../redux/actionCreator'
import mtils from 'mtils'
import { ChatType, Chat, MsgState, MsgType, SocketEmitData, FileInfo, Msg } from '../../net/model'
import { UploadFileToMinio, GetFileUrlFromMinio } from '../../net/minio'
import { UploadFileService } from '../../net/net'
import { Socket } from '../../net/socket.io'
import { CreateObjectURL, DeepCopy } from '../../common/tools'
import { readFileSync } from 'fs'
import { GetFileType, IsFileMsg } from '../../common/getFileType'
import { message } from 'antd'
import { ResponseErrorHandle } from '../../common/ResponseErrorHandle'
const BMF = require('browser-md5-file');
const bmf = new BMF();

const timeout = 30000 //socket发送超时

//不提供msgType 表示发送的是文件
export function SendMsg(value: any[], chat: Chat, msgType?: MsgType) {

    const me = store.getState().user
    const id = chat.type == ChatType.private ? me.id : chat.id

    function createChat(isSend: boolean, msgId: string, msg: any, type: MsgType): Chat {
        let chat_: Chat = { id: isSend ? id : chat.id, type: chat.type, newMsg: { id: msgId, senderId: me.id, addresseeId: chat.id, msg: msg, type: type, state: isSend ? MsgState.success : MsgState.sending, time: Date.now() } }
        if (IsFileMsg(type)) {
            chat_.newMsg.progress = 0
            if (isSend) {
                let msg_ = DeepCopy(chat_.newMsg.msg)
                delete msg_.path //删除文件的路径信息(有路径信息就表示本地文件,在转发文件的情况需要这样处理,为了不被接收方认为是本地文件)
                chat_.newMsg.msg = msg_
            } else {
                if (msg.path) {//更新到本地的信息,文件是本地的就设置进度为100,避免点击了重复下载
                    chat_.newMsg.progress = 100
                }
            }
        }
        return chat_
    }

    function updateUploadingProgress(msgId: string) {
        return (progress: number) => {
            store.dispatch(UpdateChatMsg({ chatId: chat.id, msgId: msgId, progress: progress }))
        }
    }

    function sendMsg() {
        value.forEach(v => {
            const msgId = mtils.security.uuid(25, 16)
            store.dispatch(UpdateChats(createChat(false, msgId, v, msgType)))//把自己发的消息跟新到chats
            const timeoutFunc = setTimeout(() => { store.dispatch(UpdateChatMsg({ chatId: chat.id, msgId: msgId, state: MsgState.fail })) }, timeout);
            Socket.emit('chat', { addresseeId: chat.id, data: createChat(true, msgId, v, msgType) } as SocketEmitData, () => {
                clearTimeout(timeoutFunc)
                store.dispatch(UpdateChatMsg({ chatId: chat.id, msgId: msgId, state: MsgState.success }))
            })
        })
    }

    function sendFileMsg() {
        const promiseArr = (value as { file: File, type: MsgType }[]).map(v => {
            const msgId = mtils.security.uuid(25, 16)
            store.dispatch(UpdateChats(createChat(false, msgId, { path: v.file.path, name: v.file.name, type: v.file.type, url: CreateObjectURL(v.file) } as FileInfo, v.type)))//把自己发的消息跟新到chats
            return new Promise((resolve, reject) => {
                UploadFileService(v.file, updateUploadingProgress(msgId), (res, err) => {
                    ResponseErrorHandle(res, err, '', (data: { url: string }) => {
                        store.dispatch(UpdateChatMsg({ chatId: chat.id, msgId: msgId, progress: 100 }))
                        const timeoutFunc = setTimeout(() => { store.dispatch(UpdateChatMsg({ chatId: chatId, msgId: msgId, state: MsgState.fail })) }, timeout);
                        Socket.emit('chat', { addresseeId: chat.id, data: createChat(true, msgId, { url: data.url, name: v.file.name }, v.type) } as SocketEmitData, () => {
                            clearTimeout(timeoutFunc)
                            store.dispatch(UpdateChatMsg({ chatId: chat.id, msgId: msgId, state: MsgState.success }))
                        })
                        resolve()
                    })
                    if (err) reject(err)
                })
            })
        })
        //  Promise.allSettled(promiseArr).finally(() => { })
    }

    msgType === undefined ? sendFileMsg() : sendMsg()
}

export function RelayMyFile(fileInfo: FileInfo, chats: chat[], msgType?: MsgType) {

    let file = new File([readFileSync(fileInfo.path)], fileInfo.name, { type: fileInfo.type })
    chats.forEach(v => {
        SendMsg([{ file: file, type: msgType !== undefined ? msgType : GetFileType(file) }], v)
    })

}