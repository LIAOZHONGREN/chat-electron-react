import { INIT_USER, UPDATE_USER, PUSH_NEWFRIEND, PUSH_FRIEND, UPDATE_NEWFRIEND, UPDATE_CHATS, REMOVE_NEWFRIEND, TEST, PUSH_CHAT, SET_CURRENT_CHAT, PUSH_GROUPCHAT, REMOVE_CHAT, RESET_STARE, SET_HAVE_READ, GROUPCHAT_ADD_MEMBER, SET_GROUPCHAT_NAME, REMOVE_GROUPCHAT, GROUPCHAT_REMOVE_MEMBER, ADD_NO_PROMPT_LIST, POP_NO_PROMPT_LIST, REMOVE_FRIEND, ADD_FILES_TO_CHAT_FILES_TO_BE_SENT, UPDATE_WITHDRAWN_THE_MSG, REMOVE_MSG, UPDATE_CHAT_MSG, INIT_STATE, SET_CHAT } from './actionTypes'
import { User, GroupChat, Chat, NewFriend, ChatType, FriendState, MsgState, MsgType } from '../net/model'
import { SortUserArray, LetterArr } from '../common/sort'
import mtils from 'mtils'
import { ChatData } from '../net/net'
import { MyFriendsToAddressList } from '../common/myFriendsToAddressList'
import { DeepCopy } from '../common/tools'
import store from './index'
import { UpdateWithdrawnTheMsg } from './actionCreator'


export type StateType = {
    user?: User,
    addressList?: { [initials: string]: User[] },
    groupChatList?: GroupChat[],
    chats?: Chat[],
    currentChat?: Chat | null,
    newFriends?: NewFriend[],
    unreadNews?: { [chatId: string]: number },
    unreadNewFriendNews?: { [userId: string]: number },
    noPromptList?: string[],//开启来消息免打搅的名单(记录对应聊友或群聊的id)
    test?: { num: number },
}
type stateType = {
    user: User,
    addressList: { [initials: string]: User[] },
    groupChatList: GroupChat[],
    chats: Chat[],
    currentChat: Chat | null,
    newFriends: NewFriend[],
    unreadNews: { [chatId: string]: number },
    unreadNewFriendNews: { [userId: string]: number },
    noPromptList: string[],//开启来消息免打搅的名单(记录对应聊友或群聊的id)
    test?: { num: number },
}
const defaultState: stateType = {
    user: {},
    addressList: {},
    groupChatList: [],
    chats: [],
    currentChat: null,
    newFriends: [],
    unreadNews: {},
    unreadNewFriendNews: {},
    noPromptList: [],
    test: { num: 8 }
}

export default (state = defaultState, action: { type: string, value: any }) => {
    //state只能交给仓库修改 不可以在reducer修改,reducer只能提交一个新的处理过的state
    //根据type值，编写业务逻辑
    if (action.type === INIT_USER || action.type === UPDATE_USER) {
        let newState = DeepCopy(state) //深度拷贝state 不可直接修改state,state只能被仓库修改
        const user = (action.value as User)
        if (action.type === UPDATE_USER) {
            newState.groupChatList.forEach(gc => { gc.users[user.id] = user })
            newState.chats.forEach(c => { c.users[user.id] = user })
            newState.currentChat ? newState.currentChat.users[user.id] = user : null
        }
        newState.user = user
        return newState
    }

    else if (action.type === RESET_STARE) {
        return defaultState
    }

    else if (action.type === INIT_STATE) {
        let newState = DeepCopy(state)
        const value: {} = action.value
        Object.keys(value).forEach(k => {
            if (newState[k] !== undefined) newState[k] = value[k]
        })
        return newState
    }

    else if (action.type === PUSH_NEWFRIEND) {
        let newState = DeepCopy(state)
        const nf = (action.value as NewFriend)
        const index = newState.newFriends.findIndex((v, i, o) => v.user.id === nf.user.id)
        index > -1 ? newState.newFriends[index] = nf : newState.newFriends.push(nf)
        if ([FriendState.applying, FriendState.deleted, FriendState.rejected, FriendState.passed].indexOf(nf.state) > -1) {
            newState.unreadNewFriendNews[nf.user.id] = 1
        }
        return newState
    }

    else if (action.type === PUSH_FRIEND) {
        let newState = DeepCopy(state)
        const user = (action.value as User)
        const first = (mtils.utils.makePy(user.name, false) as string).toUpperCase().charAt(0)
        let key = '#'
        LetterArr.findIndex((v, i, o) => {
            const ok = first === v
            ok ? key = v : null
            return ok
        })
        newState.addressList[key] ? (() => {
            //被通过好友验证时未在线接收不到信息,,在线后接收的验证通过的信息然后向通讯列表加入此好友,但是在登录后初始化时可能已经在后台加载此好友,所以需要判断是否存在
            const index = newState.addressList[key].findIndex((v) => (v.id === user.id))
            if (index === -1) {
                newState.addressList[key].push(user)
                SortUserArray(newState.addressList[key])
            }
        })() : newState.addressList[key] = [user]
        return newState
    }

    else if (action.type === REMOVE_FRIEND) {
        let newState = DeepCopy(state)
        const fp = (action.value as { friend: User, passive: boolean })
        Object.keys(newState.addressList).some(key => {
            const index = newState.addressList[key].findIndex(u => u.id === fp.friend.id)
            index > -1 ? newState.addressList[key].splice(index, 1) : null
            return index > -1
        })

        const index = newState.newFriends.findIndex(v => v.user.id === fp.friend.id)
        const index2 = newState.chats.findIndex(v => v.id === fp.friend.id)

        if (fp.passive) {//被删除好友
            //被删除好友,此操作让他无法发送消息(被删好友不删除聊天信息,自行删除)
            const uuid = mtils.security.uuid(25, 16)
            index2 > -1 ? newState.chats[index2].id = uuid : null
            newState.currentChat?.id === fp.friend.id ? newState.currentChat.id = uuid : null
            if (newState.unreadNews[fp.friend.id]) {
                newState.unreadNews[uuid] = newState.unreadNews[fp.friend.id]
                delete newState.unreadNews[fp.friend.id]
            }
        } else {//我删除好友
            //如果还存在此好友的好友验证信息就删除
            if (index > -1) {
                delete newState.unreadNewFriendNews[newState.newFriends[index].user.id]
                newState.newFriends.splice(index, 1)
            }
            //如果存在聊天记录就删除
            index2 > -1 ? newState.chats.splice(index2, 1) : null
            newState.currentChat?.id === fp.friend.id ? newState.currentChat = null : null
            delete newState.unreadNews[fp.friend.id]
        }
        return newState
    }

    else if (action.type === REMOVE_NEWFRIEND) {
        let newState = DeepCopy(state)
        const nf = (action.value as NewFriend)
        const index = newState.newFriends.findIndex((v, i, o) => (v.user.id === nf.user.id))
        index > -1 ? newState.newFriends.splice(index, 1) : null
        delete newState.unreadNewFriendNews[nf.user.id]
        return newState
    }
    //自己发起聊天
    else if (action.type === PUSH_CHAT) {
        let newState = DeepCopy(state)
        let chat = (action.value as Chat)
        const index = newState.chats.findIndex((v, i, o) => {
            const ok = v.id === chat.id
            ok ? chat = { ...v } : null
            return ok
        })
        index > -1 ? newState.chats.splice(index, 1) : null
        newState.chats = [chat].concat(newState.chats)//将新发起的聊天放到首位
        newState.currentChat = chat
        return newState
    }

    else if (action.type === SET_CHAT) {
        let newState = DeepCopy(state)
        let chat = (action.value as Chat)
        const index = newState.chats.findIndex(v => v.id === chat.id)
        if (index > -1) newState.chats[index] = chat
        if(chat.id === newState.currentChat?.id)newState.currentChat = chat
        return newState
    }

    else if (action.type === REMOVE_CHAT) {
        let newState = DeepCopy(state)
        const chat = action.value as Chat
        const index = newState.chats.findIndex((v, i, o) => (v.id === chat.id))
        if (newState.currentChat && chat.id === newState.currentChat.id) {
            newState.currentChat = null
        }
        delete newState.unreadNews[chat.id]
        index > -1 ? newState.chats.splice(index, 1) : null
        return newState
    }

    else if (action.type === UPDATE_CHATS) {
        let newState = DeepCopy(state)
        let chat = (action.value as Chat)

        //chat不是currentChat,并且发送者不是自己,那么chat增加一条未读消息
        if (!newState.currentChat || chat.id !== newState.currentChat.id && chat.newMsg.senderId !== newState.user.id) {
            newState.unreadNews[chat.id] ? newState.unreadNews[chat.id]++ : newState.unreadNews[chat.id] = 1
        }

        //判断chat是否已经创建,如果已经创建把新消息更新进去
        const index = newState.chats.findIndex((v, i, o) => {
            const ok = v.id === chat.id
            if (ok) {

                //撤回消息
                if (chat.newMsg.type == MsgType.withdraw) {
                    const i = v.msgs.findIndex(m => m.id === chat.newMsg.msg)
                    //设置文字msg撤回后的重新编辑功能
                    if (v.msgs[i].type == MsgType.text && v.msgs[i].senderId === newState.user.id) {
                        localStorage.setItem(v.msgs[i].id, JSON.stringify(v.msgs[i]))
                        //重新编辑功能有效时间为1分钟
                        setTimeout(() => {
                            localStorage.removeItem(v.msgs[i].id)
                            store.dispatch(UpdateWithdrawnTheMsg({ chatId: chat.id, msgId: v.msgs[i].id }))
                        }, 60000);
                    }
                    v.msgs[i].msg = v.msgs[i].type//把msg改为消息的原类型
                    v.msgs[i].type = MsgType.withdraw//把消息类型改为撤回
                    v.msgs[i].time = Date.now()
                    //如果撤回的是最新消息
                    if (v.newMsg.id === chat.newMsg.msg) v.newMsg.msg = `${chat.newMsg.senderId === newState.user.id ? '你' : v.users[chat.newMsg.senderId].name}撤回了一条消息 `
                    return true
                }

                v.newMsg = chat.newMsg
                v.msgs.push(chat.newMsg)
            }
            return ok
        })

        let chat_: Chat
        //如果对应的cha没有创建,就创建,然后把新消息更新进去
        if (index === -1) {
            let ok = false
            chat.type == ChatType.private ?
                Object.keys(newState.addressList).some((key, i, o) => {
                    newState.addressList[key].findIndex((v, i2, o2) => {
                        ok = v.id === chat.id
                        if (ok) {
                            let users: { [userId: string]: User } = {}
                            users[v.id] = v
                            users[newState.user.id] = newState.user
                            chat_ = { id: chat.id, type: chat.type, name: v.name, headImg: v.headImg, users: users, newMsg: chat.newMsg, msgs: [chat.newMsg] }
                        }
                        return ok
                    })
                    return ok
                }) : newState.groupChatList.findIndex((v, i, o) => {
                    ok = v.id === chat.id
                    ok ? chat_ = { id: chat.id, type: chat.type, name: v.name, users: v.users, newMsg: chat.newMsg, msgs: [chat.newMsg] } : null
                    return ok
                })
            ok ? newState.chats = [chat_].concat(newState.chats) : null//消息置顶
        } else {
            chat_ = { ...newState.chats[index] }
            newState.chats.splice(index, 1)
            newState.chats = [chat_].concat(newState.chats)//消息置顶
        }
        if (newState.currentChat && newState.currentChat.id === chat_.id) {
            newState.currentChat = chat_
        }

        return newState
    }

    //更新撤回的消息,没有什么实际作用,只是用于通过更新来刷新界面(通过刷新界面来取消文字信息的撤回后的重新编辑功能,因为重新编辑设置了时效)
    else if (action.type === UPDATE_WITHDRAWN_THE_MSG) {
        let newState = DeepCopy(state)
        let value: { chatId: string, msgId: string } = action.value
        if (newState.currentChat?.id === value.chatId) {
            newState.currentChat.msgs.some(v => {
                if (v.id === value.msgId) v.msg = ''
                return v.id === value.msgId
            })
        }
        return newState
    }

    else if (action.type === REMOVE_MSG) {
        let newState = DeepCopy(state)
        let value: { chatId: string, msgId: string } = action.value
        const index = newState.chats.findIndex(v => {
            if (v.id === value.chatId) {
                const i = v.msgs.findIndex(m => m.id === value.msgId)
                if (i > -1) v.msgs.splice(i, 1)
                //更新最新消息(删除的有可能是最新消息)
                v.newMsg = v.msgs.length > 0 ? DeepCopy(v.msgs[v.msgs.length - 1]) : undefined
            }
            return v.id === value.chatId
        })
        if (newState.currentChat?.id === value.chatId && index > -1) {
            newState.currentChat = DeepCopy(newState.chats[index])
        }
        return newState
    }

    else if (action.type === UPDATE_CHAT_MSG) {
        let newState = DeepCopy(state)
        const value: { chatId: string, msgId: string, progress?: number, msg?: any, state?: MsgState } = action.value
        const index = newState.chats.findIndex(v => {
            if (v.id === value.chatId) {

                const index2 = v.msgs.findIndex((m, i) => {

                    if (m.id === value.msgId) {

                        if (value.progress !== undefined) {
                            m.progress = value.progress
                            m.progress >= 100 ? m.state = MsgState.success : null
                        }

                        if (value.msg !== undefined) {
                            m.msg = value.msg
                        }

                        if (value.state !== undefined) {
                            m.state = value.state
                            m.time = Date.now()//更新msg的时间ind
                        }

                    }
                    return m.id === value.msgId

                })

                //更新msg的位置
                if (index2 > -1 && value.state !== undefined) {
                    const msg = DeepCopy(v.msgs[index2])
                    v.msgs.splice(index2, 1)
                    v.msgs.push(msg)
                }
            }

            return v.id === value.chatId
        })

        if (newState.currentChat?.id === value.chatId && index > -1) { newState.currentChat = DeepCopy(newState.chats[index]) }
        return newState
    }

    else if (action.type === SET_CURRENT_CHAT) {
        let newState = DeepCopy(state)
        newState.currentChat = action.value ? (action.value as Chat) : null
        return newState
    }

    else if (action.type === PUSH_GROUPCHAT) {
        let newState = DeepCopy(state)
        newState.groupChatList.push(action.value as GroupChat)
        return newState
    }

    else if (action.type === SET_HAVE_READ) {
        let newState = DeepCopy(state)
        const it = action.value as { id: string, type: string }
        switch (it.type) {
            case 'chat-news':
                delete newState.unreadNews[it.id]
                break;
            case 'newFriend-news':
                delete newState.unreadNewFriendNews[it.id]
                break;
            default:
                break;
        }
        return newState
    }

    else if (action.type === GROUPCHAT_ADD_MEMBER) {
        let newState = DeepCopy(state)
        const gcAndMb: { groupChat: GroupChat, member: User[] } = action.value
        newState.groupChatList.findIndex(v => {
            const ok = v.id === gcAndMb.groupChat.id
            if (ok) {
                gcAndMb.member.forEach(u => { v.users[u.id] = u })
                //如果存在此群聊的聊天,需要跟新它的成员信息
                newState.chats.findIndex(c => {
                    const ok2 = c.id === v.id
                    ok2 ? c.users = v.users : null
                    return ok2
                })
                //如果当前的聊天是此群聊,需要更新它的成员信息
                newState.currentChat?.id === v.id ? newState.currentChat.users = v.users : null
            }
            return ok
        })

        return newState
    }

    else if (action.type === SET_GROUPCHAT_NAME) {
        let newState = DeepCopy(state)
        const gcAndName: { groupChat: GroupChat, name: string } = action.value
        newState.groupChatList.findIndex(v => {
            const ok = v.id === gcAndName.groupChat.id
            if (ok) {
                v.name = gcAndName.name
                newState.chats.findIndex(c => {
                    const ok2 = c.id === v.id
                    //如果存在此群聊的聊天需要更新它的名字
                    ok2 ? c.name = gcAndName.name : null
                    return ok2
                })
                //如果当前的聊天是此群聊,需要跟新它的名字
                newState.currentChat?.id === v.id ? newState.currentChat.name = gcAndName.name : null
            }
            return ok
        })
        return newState
    }

    else if (action.type === REMOVE_GROUPCHAT) {
        let newState = DeepCopy(state)
        const gp: { groupChat: GroupChat, passive: boolean } = action.value
        let index = newState.chats.findIndex(v => v.id === gp.groupChat.id)
        if (index > -1) {
            if (!gp.passive) {
                newState.chats.splice(index, 1)//移除此群聊的聊天记录,如果存在的话
                delete newState.unreadNews[gp.groupChat.id]
                gp.groupChat.id === newState.currentChat?.id ? newState.currentChat = null : null//如果此群聊为当前聊天,把当前聊天设置为null
            } else {
                //被踢出群聊,此操作让他无法发送消息(被踢不删除聊天信息,自行删除)
                const uuid = mtils.security.uuid(25, 16)
                newState.chats[index].id = uuid
                if (newState.unreadNews[gp.groupChat.id]) {
                    newState.unreadNews[uuid] = newState.unreadNews[gp.groupChat.id]
                    delete newState.unreadNews[gp.groupChat.id]
                }
                gp.groupChat.id === newState.currentChat?.id ? newState.currentChat.id = uuid : null
            }
        }
        index = newState.groupChatList.findIndex(v => v.id === gp.groupChat.id)
        index > -1 ? newState.groupChatList.splice(index, 1) : null
        return newState
    }

    else if (action.type === GROUPCHAT_REMOVE_MEMBER) {
        let newState = DeepCopy(state)
        const gu: { groupChat: GroupChat, user: User } = action.value
        newState.groupChatList.findIndex(v => {
            v.id === gu.groupChat.id ? delete v.users[gu.user.id] : null
            return v.id === gu.groupChat.id
        })
        return newState
    }

    else if (action.type === ADD_NO_PROMPT_LIST) {
        let newState = DeepCopy(state)
        const index = newState.noPromptList.indexOf(action.value)
        index === -1 ? newState.noPromptList.push(action.value) : null
        return newState
    }

    else if (action.type === POP_NO_PROMPT_LIST) {
        let newState = DeepCopy(state)
        const index = newState.noPromptList.indexOf(action.value)
        index > -1 ? newState.noPromptList.splice(index, 1) : null
        return newState
    }

    else if (action.type === TEST) {
        let newState = DeepCopy(state)
        newState.test.num = action.value
        return newState
    }

    return state
}