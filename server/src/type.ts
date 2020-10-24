
import {IUser} from './entity/user'

export interface ResponseData {
    err?: string,
    data?: any
}

export interface NewFriend {
    state: FriendState
    user: IUser
    authentication: string
    time: Date
}

export interface SocketEmitData {
    addresseeId: string
    data: any
}

export enum FriendState {
    applying,
    pass,//我通过对方
    reject,//我拒绝对方
    rejected,//被拒绝
    await,
    deleted,
    passed//我被通过
}

export enum ChatType {
    group,
    private
}

export enum MsgType {
    text,
    img,
}

export interface Chat {
    id: string        //私聊为userId(发送方),群聊为groupChatId
    type: ChatType
    name?: string
    headImg?: string
    users?: { [userId: string]: IUser }
    newMsg?: { senderId: string, addresseeId: string, msg: string, type: MsgType }
    msgs?: { senderId: string, addresseeId: string, msg: string, type: MsgType }[]
}