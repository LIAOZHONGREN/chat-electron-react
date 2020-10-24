import fs from 'fs'
import path from 'path'
import store from './index'
import { CreateFolder } from '../common/tools'
import { Chat, NewFriend } from '../net/model'

const ChatFormat = 'chat'
const FriendFormat = 'frie'
const NewsFormat = 'ns'
const ConfigFormat = 'cg'
const ChatsPath = 'D:/chat/chats'
const NewfriendPath = 'D:/chat/nf'
const NewsPath = 'D:/chat/ns'
const ConfigPath = 'D:/chat/cg'

if (fs.existsSync(chatsPath)) CreateFolder(chatsPath)
if (fs.existsSync(newfriendPath)) CreateFolder(newfriendPath)

export function SaveDataTolocal(savePath: string, dataName: string, data: any) {
    const path_ = path.join(savePath, dataName)
    fs.writeFile(path_, JSON.stringify(data))
}

export function LoadLocalData() {
    const chatFiles = fs.readdirSync(ChatsPath)
    
}

export function SaveDataToLocal2() {

    if (store.getState().chats.length > 0) {
        let path = `D:/chat/chats/${store.getState().user.id}`
        if (!fs.existsSync(path)) CreateFolder(path)
        store.getState().chats.forEach(v => {
            const filePath = `${path}/${v.id}.${ChatFormat}`
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify(v))
            }
        })

        if (store.getState().currentChat) {
            fs.writeFileSync(`${path}/currentChat.${ChatFormat}`, JSON.stringify(v))
        }
    }

    if (store.getState().newFriends.length > 0) {
        let path = `D:/chat/newFs/${store.getState().user.id}`
        if (!fs.existsSync(path)) CreateFolder(path)
        store.getState().newFriends.forEach(v => {
            const filePath = `${path}/${v.id}.${FriendFormat}`
            //判断文件夹中是否存在文件,如果存在shu
            if (fs.readdirSync(path).length > 0) {

            }
            fs.writeFileSync(filePath, JSON.stringify(v))
        })
    }
}