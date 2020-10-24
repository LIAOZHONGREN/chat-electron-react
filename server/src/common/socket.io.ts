import { Server } from 'socket.io'
import { SocketEmitData, ChatType, Chat, NewFriend, FriendState } from '../type'
import { SetAsync, GetAsync, ExpireAsync, ZaddAsyac, ExistsAsync, ZrangeAsync, DelAsync, ZremRangeByScoreAsync, ZrangeBySoreAsync, HsetAsync, HgetAsync, HdelAsync } from '../common/redis'
import logger from './logger'
import { getConnection } from 'typeorm'
import { MyFriend, IMyFriends } from '../entity/myFriend'
import { IGroupChat } from '../entity/groupChat'
import { IUser } from '@/entity/user'

const msgsKeySuffix = 'msgskey'//记录不在线未发出信息的redis key的后缀
const onlineKey = 'onlineKey'//记录在线的userid的散列key value的key为socketid,value为userid

//接收信息方未在线 暂时把消息存放在redis 有效期为7天
async function msgTimingStorage(userId: string, event: string, msg: any) {
    const now = Date.now()
    const key = `${userId}_${now}`
    await SetAsync(key, JSON.stringify({ event: event, msg: msg }))
    ExpireAsync(key, 604800)//数据只保存7天
    ZaddAsyac(userId + msgsKeySuffix, now, key)
    const sevenDaysAgo = now - 604800000
    ZremRangeByScoreAsync(userId + msgsKeySuffix, 0, sevenDaysAgo)//清除过期的msg的key
}

export function SocketIoService(io: Server) {

    const chatNamespace = io.of('/chat')
    chatNamespace.on('connection', socket => {
        // console.log('客户端进入')
        socket.emit('connection', 'ok', () => {
            console.log('与客户的握手成功')
        })

        socket.on('disconnect', async (reason) => {
            const userId = await HgetAsync(onlineKey, socket.id)
            if (userId) {
                DelAsync(userId)
                HdelAsync(onlineKey, socket.id)
            }
        })

        socket.on('off-line', async (data, cb) => {
            const userId = await HgetAsync(onlineKey, socket.id)
            DelAsync(userId)
            HdelAsync(onlineKey, socket.id)
            if (cb) cb()
            socket.disconnect(true)
        })

        socket.on('on-line', async (data, cb) => {

            const userId = ((data as SocketEmitData).data as string)
            //账号在别的设备上登录,断开原先登录的设备
            const socketId = await GetAsync(userId)
            if (socketId && socket.nsp.sockets[socketId]) {
                socket.nsp.sockets[socketId].emit('be-occupied', '', () => {
                    socket.nsp.sockets[socketId].disconnect(true)
                })
            }
            SetAsync(userId, socket.id)//保存socket.id到redis key为userId,方便中转信息
            HsetAsync(onlineKey, socket.id, userId)//保存userId到散列key为onlineKey,的散列中,内容key为socket.id,方便对应用户下线清除对应用户保存在redis的数据
            //处理最近7天未接收的msg
            const key = userId + msgsKeySuffix
            const exists = await ExistsAsync(key)
            if (exists) {
                const now = Date.now()
                const sevenDaysAgo = now - 604800000
                const msgKeys = await ZrangeBySoreAsync(key, sevenDaysAgo, now)
                for (let i = 0; i < msgKeys.length; i++) {
                    const msg: { event: string, msg: any } = JSON.parse(await GetAsync(msgKeys[i]))
                    // console.log(`msg:${JSON.stringify(msg)}`)
                    msg ? socket.emit(msg.event, msg.msg) : null
                }
                DelAsync(msgKeys.concat([key]))
            }
            if (cb) cb()
        })

        socket.on('addFriend', async (data, cb) => {
            const sed = (data as SocketEmitData)
            const socketId = await GetAsync(sed.addresseeId)
            socketId ? socket.to(socketId).emit('addFriend', sed.data) : msgTimingStorage(sed.addresseeId, 'addFriend', sed.data)
            if (cb) cb()
        })

        socket.on('chat', async (data, cb) => {
            const sed = (data as SocketEmitData)
            const chat = (sed.data as Chat)
            const socketId = chat.type == ChatType.private ? await GetAsync(sed.addresseeId) : sed.addresseeId
            socketId ? socket.to(socketId).emit('chat', chat) : msgTimingStorage(sed.addresseeId, 'chat', chat)
            if (cb) cb()
        })

        socket.on('drawMemberIntoTheGroupChat', async (data, cb) => {
            const sed = (data as SocketEmitData)
            const gm = (sed.data as { groupChat: IGroupChat, member: IUser[] })
            if (gm.member) {
                gm.member.forEach(async u => {
                    const socketId = await GetAsync(u.id)
                    socket.to(socketId).emit('joinGroupChat', gm.groupChat)
                })
            } else {
                //slice(1):剔除第一个(不发给群创建人)
                Object.keys(gm.groupChat.users).slice(1).forEach(async (k) => {
                    const socketId = await GetAsync(k)
                    socket.to(socketId).emit('joinGroupChat', gm.groupChat)
                })
            }
            cb ? cb() : null
        })

        socket.on('joinGroupChat', (data, cb) => {
            const sed = (data as SocketEmitData)
            socket.join(sed.data)
            cb ? cb() : null
        })

        socket.on('groupChat-add-member', (data, cb) => {
            const sed = data as SocketEmitData
            socket.to(sed.addresseeId).emit('groupChat-add-member', sed.data)
            cb ? cb() : null
        })

        socket.on('groupChat-set-name', (data, cb) => {
            const sed = data as SocketEmitData
            socket.to(sed.addresseeId).emit('groupChat-set-name', sed.data)
            cb ? cb() : null
        })

        socket.on('exit-groupChat', (data, cb) => {
            const sed = data as SocketEmitData
            socket.leave(sed.addresseeId)//退群后离开房间
            socket.to(sed.addresseeId).emit('exit-groupChat', sed.data)
            cb ? cb() : null
        })

        socket.on('remove-groupChat-member', async (data, cb) => {
            const sed = data as SocketEmitData
            socket.to(sed.addresseeId).emit('remove-groupChat-member', sed.data)
            //发送完再移出房间,因为对方要接收被移出群聊的公告
            const userId = (sed.data as { groupChat: IGroupChat, user: IUser }).user.id
            const socketId = await GetAsync(userId)
            socketId ? socket.nsp.sockets[socketId].leave(sed.addresseeId) : null//如果被踢出群聊的成员在线,把他移出房间
            cb ? cb() : null
        })

        socket.on('video-call', async (data, cb) => {
            const sed = data as SocketEmitData
            const socketId = await GetAsync(sed.addresseeId)
            socket.to(socketId ? socketId : sed.addresseeId).emit('video-call', sed.data)
            if (cb) cb()
        })

        socket.on('voice-call', async (data, cb) => {
            const sed = data as SocketEmitData
            const socketId = await GetAsync(sed.addresseeId)
            socket.to(socketId ? socketId : sed.addresseeId).emit('voice-call', sed.data)
            if (cb) cb()
        })

    })


}