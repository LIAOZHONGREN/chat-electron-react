

export enum GenderEnum {
    unisex,
    girl,
    boy
}

export enum MsgType {
    text,
    img,
    video,
    music,
    voice,
    zip,
    word,
    excel,
    pdf,
    ppt,
    txt,
    xml,
    unknown,//未知文件
    notice,//通知
    withdraw,//撤回消息
}

export enum CallType {
    video,
    voice
}

export enum CallState {
    call,
    hangUp,
    communication
}

export enum WindowCommunicationType {
    start,//刚打开窗口完成(或窗口已经打开后,再次打开)
    close,//关闭窗口
    end,//通讯结束(然后关闭窗口)
    communication//通讯
}

export enum MsgState {
    sending,
    success,
    fail
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

export interface FileInfo {
    path?: string,
    name?: string,
    type?: string,
    url?: string
}

export interface User {
    id?: string
    identity?: string
    name?: string
    password?: string
    gender?: GenderEnum
    area?: string
    headImg?: string | FileInfo
}

export interface GroupChat {
    id?: string
    name?: string
    creator?: User
    users?: { [index: string]: User }
}

export interface MyFriends {
    users?: User[]
}

export interface Msg {
    id: string,
    progress?: number,
    senderId: string,
    addresseeId: string,
    msg: any,
    type: MsgType,
    state: MsgState,
    time?: number
}

export interface Chat {
    id: string        //私聊为userId(发送方),群聊为groupChatId
    type: ChatType
    name?: string
    headImg?: string
    users?: { [userId: string]: User }
    newMsg?: Msg
    msgs?: Msg[]
}

export interface NewFriend {
    state: FriendState
    user: User
    authentication: string
    time: Date
}

export interface SocketEmitData {
    addresseeId: string
    data: any
}

export interface MusicInfo {
    id: number,
    name: string,
    fileInfo: FileInfo
    timeLength: string,
    love: boolean
}

export interface VideoInfo {
    id: number,
    name: string,
    fileInfo: FileInfo
    timeLength: string
}

export type CallData<T> = {
    type: CallType,
    state: CallState,
    callerId: string,
    data: T
}

export type WindowCommunicationData = {
    name?: string//窗口名字(窗口的唯一标识)
    type: WindowCommunicationType,
    data?: any
}