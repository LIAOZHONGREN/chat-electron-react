
import io from 'socket.io-client'
import { SocketIoChatUrl } from './url'
import store from '../redux/index'
import { PushNewFriend, UpdateChats, PushFriend, PushGroupChat, AddMemberToGroupChat, SetGroupChatName, RemoveMemberFromGroupChat, RemoveGroupChat, RemoveFriend } from '../redux/actionCreator'
import { NewFriend, AddFriendData, FriendState, Chat, GroupChat, User, CallData, SocketEmitData, WindowCommunicationType, WindowCommunicationData, CallState, CallType } from './model'
import { OpenModalWin } from '../common/electronTool'
import { ipcRenderer } from 'electron'


const newsTips = new Audio(require('../static/sound/来信息提示声音.mp3').default)
const addFriendTips = new Audio(require('../static/sound/被申请加聊友提示声音.mp3').default)
const socketChat = io.connect(SocketIoChatUrl)
socketChat.on('connect', function () {
    //socketChat.emit('call', 'hello')
});

socketChat.on('disconnect', () => {
    socketChat.connect()
});

socketChat.on('chat', data => {
    const chat = data as Chat
    if (store.getState().noPromptList.indexOf(chat.id) === -1) {
        newsTips.play()
    }
    store.dispatch(UpdateChats(data as Chat))
});

socketChat.on('addFriend', data => {
    addFriendTips.play()
    const nf: NewFriend = data
    store.dispatch(PushNewFriend(nf))
    nf.state == FriendState.passed ? store.dispatch(PushFriend(nf.user)) : null
    nf.state == FriendState.deleted ? store.dispatch(RemoveFriend({ id: nf.user.id }, true)) : null
})

socketChat.on('joinGroupChat', data => {

    const gc = data as GroupChat
    store.dispatch(PushGroupChat(gc))
    socketChat.emit('joinGroupChat', { addresseeId: '', data: gc.id } as SocketEmitData)

})

socketChat.on('groupChat-add-member', data => {
    const gm: { groupChat: GroupChat, member: User[] } = data
    store.dispatch(AddMemberToGroupChat(gm.groupChat, gm.member))
})

socketChat.on('groupChat-set-name', data => {
    const gc: GroupChat = data
    store.dispatch(SetGroupChatName(gc, gc.name))
})

socketChat.on('exit-groupChat', data => {
    const gu: { groupChat: GroupChat, user: User } = data
    store.dispatch(RemoveMemberFromGroupChat(gu))
})

socketChat.on('remove-groupChat-member', data => {
    const gu: { groupChat: GroupChat, user: User } = data
    //如果被踢出群聊的是自己,把对应的群聊删除
    if (store.getState().user.id === gu.user.id) {
        store.dispatch(RemoveGroupChat(gu.groupChat, true))
        return
    }
    store.dispatch(RemoveMemberFromGroupChat(gu))
})

export let VideoCallWindowNames: { [userId: string]: { name: string, initData: (data: any) => void, sendData: (data: any) => void } } = {}//保存当前打开的视频通话窗口的名称的对象
let callerIDModal: { name: string, initData: (data: any) => void, sendData: (data: any) => void } = null//是否已经打开来电提示窗口
socketChat.on('video-call', data => {
    const value: CallData<any> = data
    callHandle(value)
})

export let VoiceCallWindowNames: { [userId: string]: { name: string, initData: (data: any) => void, sendData: (data: any) => void } } = {}
socketChat.on('voice-call', data => {
    const value: CallData<any> = data
    callHandle(value)
})


function callHandle(value: CallData<any>) {
    if (value.state == CallState.call) {
        let caller: User
        Object.values(store.getState().addressList).some(us => {
            caller = us.find(u => u.id === value.callerId)
            return caller !== undefined
        })

        if (caller) {
            callerIDModal = OpenModalWin(300, 200, 'callerIDModal', {
                followParent: { x: screen.width - 320, y: screen.height - 260 },
                communication: data => {
                    if (data.type == WindowCommunicationType.start) {
                        callerIDModal.initData({ caller: caller, callData: value })
                        return
                    }
                    if (data.type == WindowCommunicationType.end || data.type == WindowCommunicationType.close) callerIDModal = null
                    if (data.type == WindowCommunicationType.communication) {
                        const value: { isHangUp: boolean, caller: User, callData?: CallData<any> } = data.data
                        if (!value.isHangUp) {

                            if (value.callData.type == CallType.video) {

                                const videoCallModal = OpenModalWin(960, 540, 'videoCallModal', {
                                    followParent: true,
                                    communication: data => {
                                        if (data.type == WindowCommunicationType.start) {
                                            videoCallModal.initData({ me: store.getState().user, caller: value.caller, callData: value.callData })
                                            return
                                        }
                                        if (typeof data.data === 'string') data.data = JSON.parse(data.data)
                                        if (data.type == WindowCommunicationType.close || data.type == WindowCommunicationType.end) {
                                            delete VideoCallWindowNames[value.caller.id]
                                            return
                                        }
                                        if (data.type == WindowCommunicationType.communication) socketChat.emit('video-call', data.data)
                                    },
                                    controlMainWindow: true
                                })
                                VideoCallWindowNames[value.caller.id] = videoCallModal

                            } else {

                                const voiceCallModal = OpenModalWin(300, 250, 'voiceCallModal', {
                                    followParent: true,
                                    communication: data => {
                                        if (data.type == WindowCommunicationType.start) {
                                            voiceCallModal.initData({ me: store.getState().user, caller: value.caller, callData: value.callData })
                                            return
                                        }
                                        if (typeof data.data === 'string') data.data = JSON.parse(data.data)
                                        if (data.type == WindowCommunicationType.close || data.type == WindowCommunicationType.end) {
                                            delete VoiceCallWindowNames[value.caller.id]
                                            return
                                        }
                                        if (data.type == WindowCommunicationType.communication) socketChat.emit('voice-call', data.data)
                                    },
                                    controlMainWindow: true
                                })

                                VoiceCallWindowNames[value.caller.id] = voiceCallModal

                            }

                        } else {
                            const event = value.callData.type == CallType.video ? 'video-call' : 'voice-call'
                            socketChat.emit(event, { addresseeId: value.caller.id, data: { type: value.callData.type, state: CallState.hangUp, callerId: store.getState().user.id, data: null } as CallData<any> } as SocketEmitData)
                        }
                    }
                },
                controlMainWindow: true,
                windowName: 'callerID-modal'
            })
        }
    } else {
        let modal: { name: string, initData: (data: any) => void, sendData: (data: any) => void } = null
        if (value.type == CallType.video) {
            modal = VideoCallWindowNames[value.callerId] ? VideoCallWindowNames[value.callerId] : callerIDModal
        } else {
            modal = VoiceCallWindowNames[value.callerId] ? VoiceCallWindowNames[value.callerId] : callerIDModal
        }
        if (modal) modal.sendData(value)
    }
}


export const Socket = socketChat