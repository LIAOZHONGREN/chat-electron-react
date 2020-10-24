//用于处理数据的本地持久化
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import { Chat, Msg } from '../net/model'
import { StateType } from '../redux/reducer'
import { CreateFolder } from './tools'
import { existsSync } from 'fs'

export type IdentityData = { state?: StateType, lastTime?: number }
type data = { [userId: string]: IdentityData };

if (!existsSync('D:/chat/')) CreateFolder('D:/chat/')

const adapter = new FileSync('D:/chat/db.json', {
    serialize: (data_: data) => JSON.stringify(data_),
    deserialize: (data_: string) => JSON.parse(data_) as data
});
const db = low(adapter);

db.defaults({} as data).write();

//记录前台在本地数据记录处加载了多少条消息数据(用于退出程序时消息数据合并的逻辑判断)
let msgLoadingCount: { [chatId: string]: number } = {}

export function GetIdentityData(userId: string): IdentityData | null {
    let identityData_: IdentityData = db.get(userId).cloneDeep().value()
    if (!identityData_) return null
    identityData_.state.chats.forEach(v => {
        v.msgs = v.msgs.reverse().slice(0, 11).reverse()//获取最新的50条消息
        msgLoadingCount[v.id] = v.msgs.length
    })
    if (identityData_.state.currentChat) identityData_.state.currentChat.msgs = identityData_.state.currentChat.msgs.reverse().slice(0, 11).reverse()
    return identityData_
}

export function SaveStateData(userId: string, state: StateType) {

    if (db.has(userId).value()) {
        let chats1: Map<string, Chat> = new Map(state.chats.map(v => [v.id, v]))
        const chats2: Map<string, Chat> = new Map((db.get(`${userId}.state.chats`).value() as Chat[]).map(v => [v.id, v]))
        chats1.forEach(v => {
            if (chats2.has(v.id)) {
                //把新的聊天信息和旧的聊天信息合并
                const msgs = chats2.get(v.id).msgs
                v.msgs = msgs.reverse().slice(msgLoadingCount[v.id] + 1).reverse().concat(v.msgs)
            }
        })
        //把Map形式的chats转换回[]
        state.chats = Array.from(chats1.values())
        db.update(userId, (old) => ({ state: state, lastTime: Date.now() } as IdentityData)).write()
    } else {
        db.set(userId, { state: state, lastTime: Date.now() } as IdentityData).write()
    }
}

export function LoadingMsgData(userId: string, chatId: string): Msg[] {
    const chat: Chat = db.get(`${userId}.state.chats`).find({ id: chatId }).cloneDeep().value()
    if (!chat) return []//不存在
    const msgs = chat.msgs.reverse().slice(msgLoadingCount[chatId], msgLoadingCount[chatId] + 10).reverse()
    msgLoadingCount[chatId] += msgs.length
    return msgs
}

export function DeleteChatData(userId: string, chatId: string) {
    db.get(`${userId}.state.chats`).remove(v => v.id === chatId).write()
}