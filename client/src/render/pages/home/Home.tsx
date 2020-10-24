import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import './home.scss'
import { Row, Col, Space, Avatar, Drawer, Popover, Input, Divider, message, Tooltip, notification, Badge } from 'antd'
import { UserOutlined } from '@ant-design/icons';
import { Nav, MyInput, MyButton, MyModal, Loading, MyCountDown, MyRadio, MyPopover, MyAudio, MyList } from '../../components/components'
import { OpenModalWin } from '../../common/electronTool'
import Zmage from 'react-zmage'
import { User, Chat, MsgType, NewFriend, FriendState, SocketEmitData, GenderEnum, GroupChat, ChatType, MsgState, FileInfo, MusicInfo, Msg, WindowCommunicationData, WindowCommunicationType } from '../../net/model'
import store from '../../redux/index'
import { UpdateNewFriend, RemoveNewFriend, PushFriend, PushChat, UpdateChats, SetCurrentChat, PushGroupChat, UpdataUser, RemoveChat, SetHaveRead, InitUser, ResetState, AddMemberToGroupChat, SetGroupChatName, RemoveGroupChat, AddNoPromptList, PopNoPromptList, RemoveMemberFromGroupChat, PushNewFriend, RemoveFriend, RemoveMsg, UpdateChatMsg, InitState, SetChat } from '../../redux/actionCreator'
import { IdentitySearchService, GetChatDataService, GroupChatAddMemberService, SetGroupChatNameService, ResponseData, ExitGroupChatService, AddFriendService, DeleteFriendService, DownloadFileService } from '../../net/net'
import { TrimAll, IsJSONEqual, TestToHtml, DeepCopy, FileToDataUrl, CreateObjectURL, CreateFolder } from '../../common/tools'
import { Socket, VideoCallWindowNames, VoiceCallWindowNames } from '../../net/socket.io'
import { IsMyFriend } from '../../common/isMyFriend'
import { ipcRenderer, shell, clipboard } from 'electron'
import { ResponseErrorHandle } from '../../common/ResponseErrorHandle'
import { GetFileType, FileType, IsFileMsg } from '../../common/getFileType'
import { GetFileUrlFromMinio, UploadFileToMinio } from '../../net/minio'
import mtils from 'mtils'
import { SendMsg, RelayMyFile } from './sendMsg'
import { writeFileSync, existsSync } from 'fs'
import { StateType } from '../../redux/reducer';
import { DeleteChatData, GetIdentityData, LoadingMsgData, ResetMsgLoadingCount, SaveStateData } from '../../common/lowdb'
import { chunk, round } from 'lodash'
import emoji from '../../static/json/emoji.json'
import emoticon from '../../static/json/emoticon.json'
import Recorder from 'recorder-core'
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'
import 'recorder-core/src/extensions/lib.fft'
import 'recorder-core/src/extensions/frequency.histogram.view'
import '../../static/scss/main.scss'

export interface IHomeProps {
}

//头像背景色
const headColors = ['#ff7875', '#bae637', '#ffec3d', '#36cfc9', '#40a9ff', '#597ef7', '#9254de', '#eb2f96', '#ffe58f', '#eaff8f']

function ChatsList() {

    const [chats, setchats] = useState<Chat[]>(DeepCopy(store.getState().chats))
    const [currentChatId, setcurrentChatId] = useState<string>(store.getState().currentChat ? store.getState().currentChat.id : '')
    const [unreadNews, setunreadNews] = useState<{ [id: string]: number }>(DeepCopy(store.getState().unreadNews))

    function selectListChat(chat: Chat) {
        if (unreadNews[chat.id]) {
            store.dispatch(SetHaveRead(chat.id, 'chat-news'))
        }
        store.dispatch(SetCurrentChat(chat))
    }

    function removeListChat(chat: Chat) {
        DeleteChatData(store.getState().user.id, chat.id)
        store.dispatch(RemoveChat(chat))
    }

    function getMsgPrefix(chat: Chat): string {
        if (chat.newMsg.type == MsgType.notice) {
            return '公告:'
        } else {
            return `${chat.newMsg.senderId === store.getState().user.id ? '' : chat.users[chat.newMsg.senderId].name + ':'}`
        }
    }

    useEffect(() => {
        const uns = store.subscribe(() => {
            const id = store.getState().currentChat ? store.getState().currentChat.id : ''
            !IsJSONEqual(currentChatId, id) ? setcurrentChatId((store.getState().currentChat ? store.getState().currentChat.id : '')) : null
            !IsJSONEqual(chats, store.getState().chats) ? setchats(DeepCopy(store.getState().chats)) : null
            !IsJSONEqual(unreadNews, store.getState().unreadNews) ? setunreadNews(DeepCopy(store.getState().unreadNews)) : null
        })
        return () => { uns() }
    }, [currentChatId, chats, unreadNews,])

    return (
        <MyList direction='vertical' width='100%' height='100%'>
            {
                chats.map((item, index) => (
                    <MyPopover key={item.id} menuContent={
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5px', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                            <Space direction='vertical' align='center' size={5}>
                                <MyButton onClick={() => { removeListChat(item) }} buttonColor='#f5222d'>删除聊天</MyButton>
                            </Space>
                        </div >
                    }>
                        <div className={'home-msg-item ' + (currentChatId === item.id ? 'selected' : null)} onClick={() => { selectListChat(item) }}>
                            <Row gutter={10}>
                                <Col>
                                    <Badge count={unreadNews[item.id]} style={{ transform: 'scale(0.7)' }}>
                                        <Avatar size={30} src={item.headImg} style={{ backgroundColor: headColors[item.name.length % 10] }}>{item.name}</Avatar>
                                    </Badge>
                                </Col>
                                <Col><div className='home-mag-item-username'>{item.name}</div></Col>
                            </Row>
                            {
                                item.newMsg ? <div className='home-msg-info'>{getMsgPrefix(item) + (() => {
                                    switch (item.newMsg.type) {
                                        case MsgType.text:
                                        case MsgType.notice:
                                            return item.newMsg.msg
                                            break;
                                        case MsgType.withdraw:
                                            return `${item.newMsg.senderId === store.getState().user.id ? '你' : item.users[item.newMsg.senderId].name}撤回了一条消息 `
                                        case MsgType.img:
                                            return '[图片]'
                                            break;
                                        case MsgType.music:
                                            return '[音乐]'
                                            break;
                                        case MsgType.video:
                                            return '[视频]'
                                            break;
                                        case MsgType.voice:
                                            return '[语音]'
                                            break;
                                        default:
                                            return '[文件]'
                                            break;
                                    }
                                })()}</div> : null
                            }
                        </div>
                    </MyPopover>
                ))
            }
        </MyList>
    )
}

function AddressList(props: { onSelectListItem?: (item: User | GroupChat | NewFriend) => void, onRejectUser?: (nf: NewFriend) => void, onAcceptFrient?: (nf: NewFriend) => void, onRemoveNewFriend?: (nf: NewFriend) => void }) {

    const { onSelectListItem, onRejectUser, onAcceptFrient, onRemoveNewFriend } = props
    const frientStateText = [{ text: '等待审核', color: '#ffec3d' }, { text: '已通过', color: '#52c41a' }, { text: '已拒绝', color: '#8c8c8c' }, { text: '被拒绝', color: '#ff4d4f' }, { text: '等待对方审核', color: '#91d5ff' }, { text: '你已不是对方好友', color: '#ff4d4f' }, { text: '已通过', color: '#52c41a' }]
    const [newFriends, setnewFriends] = useState<NewFriend[]>(DeepCopy(store.getState().newFriends))
    const [groupChatList, setgroupChatList] = useState<GroupChat[]>(DeepCopy(store.getState().groupChatList))
    const [addressList, setaddressList] = useState<{ [initials: string]: User[] }>({ ...store.getState().addressList })
    const [unreadNewFriendNews, setunreadNewFriendNews] = useState<{ [userId: string]: number }>({ ...store.getState().unreadNewFriendNews })
    const [selectKey, setselectKey] = useState<string>('')

    function onClickSelectNewFriend(nf: NewFriend) {
        setselectKey(nf.user.id + 'newFriend')
        onSelectListItem ? onSelectListItem(nf) : null
        if (unreadNewFriendNews[nf.user.id]) {
            store.dispatch(SetHaveRead(nf.user.id, 'newFriend-news'))
        }
    }

    function onClickGcOrFriend(item: GroupChat | User) {
        setselectKey(item.id)
        onSelectListItem ? onSelectListItem(item) : null
    }

    useEffect(() => {
        const uns = store.subscribe(() => {
            !IsJSONEqual(newFriends, store.getState().newFriends) ? setnewFriends(DeepCopy(store.getState().newFriends)) : null
            !IsJSONEqual(groupChatList, store.getState().groupChatList) ? setgroupChatList(DeepCopy(store.getState().groupChatList)) : null
            !IsJSONEqual(addressList, store.getState().addressList) ? setaddressList(DeepCopy(store.getState().addressList)) : null
            !IsJSONEqual(unreadNewFriendNews, store.getState().unreadNewFriendNews) ? setunreadNewFriendNews(DeepCopy(store.getState().unreadNewFriendNews)) : null
        })
        return () => { uns() }
    }, [newFriends, groupChatList, addressList, unreadNewFriendNews])

    return (
        <MyList direction='vertical' width='100%' height='100%'>
            {
                newFriends.length > 0 ? (
                    <div style={{ width: '100%', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'white' }}>新朋友</div>
                ) : null
            }
            {
                newFriends.map((item, index) => (
                    <MyPopover key={item.user.id + 'newFriend'} menuContent={
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5px', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                            <Space direction='vertical' align='center' size={5}>
                                {item.state == FriendState.applying ? <MyButton onClick={() => { onAcceptFrient ? onAcceptFrient(item) : null }} buttonColor='#73d13d'>通过</MyButton> : null}
                                {item.state == FriendState.applying ? <MyButton onClick={() => { onRejectUser ? onRejectUser(item) : null }} buttonColor='#f5222d'>拒绝</MyButton> : null}
                                <MyButton onClick={() => { onRemoveNewFriend ? onRemoveNewFriend(item) : null }} buttonColor='#f5222d'>删除</MyButton>
                            </Space>
                        </div >
                    }>
                        <div className={`home-address-item ${selectKey === (item.user.id + 'newFriend') ? 'selected' : ''}`} onClick={() => { onClickSelectNewFriend(item) }}>
                            <Badge count={unreadNewFriendNews[item.user.id]} style={{ transform: 'scale(0.7)' }}>
                                <Avatar size={40} src={item.user.headImg} style={{ backgroundColor: headColors[item.user.name.length % 10] }}>{item.user.name}</Avatar>
                            </Badge>
                            <div className='home-address-item-username'>{item.user.name}</div>
                            <div style={{ position: 'absolute', bottom: 3, right: 3, color: frientStateText[item.state].color, fontSize: '13px' }}>{frientStateText[item.state].text}</div>
                        </div>
                    </MyPopover>
                ))
            }
            {
                groupChatList.length > 0 ? (
                    <div style={{ width: '100%', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'white' }}>群聊</div>
                ) : null
            }
            {
                groupChatList.map((item, index) => (
                    <div className={`home-address-item ${selectKey === item.id ? 'selected' : ''}`} key={item.id} onClick={() => { onClickGcOrFriend(item) }} key={item.id}>
                        <Avatar size={40} style={{ backgroundColor: headColors[item.name.length % 10] }}>{item.name}</Avatar>
                        <div className='home-address-item-username'>{item.name}</div>
                    </div>
                ))
            }
            {
                Object.keys(addressList).map((key, index) => (
                    <div style={{ position: 'relative', width: '100%', display: 'inline-block' }} key={key}>
                        <div style={{ width: '100%', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'white' }}>{key}</div>
                        {
                            addressList[key].map((user, index2) => (
                                <div className={`home-address-item ${selectKey === user.id ? 'selected' : ''}`} key={user.id} onClick={() => { onClickGcOrFriend(user) }}>
                                    <Avatar size={40} src={user.headImg} style={{ backgroundColor: headColors[user.name.length % 10] }}>{user.name}</Avatar>
                                    <div className='home-address-item-username'>{user.name}</div>
                                </div>
                            ))
                        }
                    </div>
                ))
            }
        </MyList>
    )

}

function NewFriendInfoShow(props: { newFriend?: NewFriend, onRejectUser?: () => void, onAcceptFrient?: () => void, onRemoveUser?: () => void, onStartChat?: () => void }) {

    const { newFriend, onRemove, onRejectUser, onAcceptFrient, onRemoveUser, onStartChat } = props
    const [nf, setnf] = useState<NewFriend | null>(DeepCopy(newFriend))

    //拒绝
    function onClickReject() {
        onRejectUser ? onRejectUser() : null
    }
    //接受
    function onClickAccept() {
        onAcceptFrient ? onAcceptFrient() : null
    }
    //拒绝后点击移除
    function onClickRemove() {
        onRemoveUser ? onRemoveUser() : null
    }

    function onClickStartChat() {
        onStartChat ? onStartChat() : null
    }

    useEffect(() => { setnf(DeepCopy(newFriend)) }, [newFriend])
    useEffect(() => {
        const uns = store.subscribe(() => {
            const nf_ = store.getState().newFriends.find(v => v.user.id === nf?.user.id)
            !IsJSONEqual(nf, nf_) ? setnf(DeepCopy(nf_)) : null
        })
        return () => { uns() }
    }, [nf])

    const content = nf ? (
        <div className='home-friend-info-con' >
            <div className='home-friend-info-top'>
                <div className='home-Identity-info'>
                    <div className='home-Identity-username'>{nf.user.name}</div>
                    <div className='home-Identity-gender'>
                        {
                            nf.user.gender != GenderEnum.unisex ? (
                                nf.user.gender == GenderEnum.girl ? < img width={25} src={require('../../static/svg/girl.svg').default} alt="" />
                                    : < img width={25} src={require('../../static/svg/boy.svg').default} alt="" />) : null
                        }
                    </div>
                </div>
                <Avatar size={60} src={nf.user.headImg} style={{ backgroundColor: headColors[nf.user.name.length % 10] }}>{nf.user.name}</Avatar>
            </div>
            {
                nf.authentication ? (<div className='home-encourage-words'><p style={{ color: '#fff' }}>身份认证:</p>{nf.authentication}</div>) : null
            }
            <Divider type='horizontal' style={{ margin: '5px 0', borderColor: '#fff' }} />
            <div className='home-friend-info-bottom'>
                {
                    nf.user.area ? (
                        <Row>
                            <Col span={6}><div className='home-tag-info-title'>地区</div></Col>
                            <Col span={18}><div className='home-tag-info-con'>{nf.user.area}</div></Col>
                        </Row>
                    ) : null
                }
                <Row>
                    <Col span={6}><div className='home-tag-info-title'>账号</div></Col>
                    <Col span={18}><div className='home-tag-info-con'>{nf.user.identity}</div></Col>
                </Row>
            </div>
            <Divider type='horizontal' style={{ margin: '5px 0', borderColor: '#fff' }} />
            <div className='home-action-but'>
                {
                    (() => {
                        switch (nf.state) {
                            case FriendState.applying:
                                return (
                                    <Space direction='horizontal' size={10}>
                                        <MyButton buttonColor='#ff4d4f' onClick={onClickReject}>拒绝</MyButton>
                                        <MyButton buttonColor='#73d13d' onClick={onClickAccept}>接收成为聊友</MyButton>
                                    </Space>
                                )
                                break;
                            case FriendState.pass:
                            case FriendState.passed:
                                return (<MyButton onClick={onClickStartChat} buttonColor='#40a9ff'>发消息</MyButton>)
                                break;
                            case FriendState.reject:
                            case FriendState.rejected:
                            case FriendState.deleted:
                                return (<MyButton onClick={onClickRemove} buttonColor='#ff4d4f'>移除</MyButton>)
                                break;
                            default:
                                break;
                        }
                    })()
                }
            </div>
        </div>
    ) : null
    return content
}

function GroupChatAddMember(props: { groupChat: GroupChat, onClose?: () => void }) {

    const { groupChat, onClose } = props
    const [addressList, setaddressList] = useState<{ [initials: string]: { user: User, isGroupMember: boolean }[] }>(markGroupMember(store.getState().addressList))
    const [selectedList, setselectedList] = useState<User[]>([])

    function isSelected(user: User) {
        return selectedList.findIndex((v) => (v.id === user.id)) > -1
    }

    //标记已经是群成员的user
    function markGroupMember(al: { [initials: string]: User[] }): { [initials: string]: { user: User, isGroupMember: boolean }[] } {
        let al2: { [initials: string]: { user: User, isGroupMember: boolean }[] } = {}
        for (const k of Object.keys(al)) {
            const temp = al[k].map((u) => ({ user: u, isGroupMember: Object.keys(groupChat.users).findIndex((userId) => (userId === u.id)) > -1 }))
            al2[k] = temp
        }
        return al2
    }

    function onClickUserItem(user: User) {
        let sl = [...selectedList]
        const i = sl.findIndex((v, _, o) => (v.id === user.id))
        i === -1 ? sl.push(user) : sl.splice(i, 1)
        setselectedList(sl)
    }

    function onRemoveSelectUserItem(user: User) {
        let sl = [...selectedList]
        const i = sl.findIndex((v, _, o) => (v.id === user.id))
        if (i !== -1) {
            sl.splice(i, 1)
            setselectedList(sl)
        }
    }

    function onClickCancel() {
        setselectedList([])
    }

    function onClickAdd() {
        if (selectedList.length < 1) {
            message.warning('你还没有选择要添加的朋友!')
            return
        }
        GroupChatAddMemberService({ newMember: selectedList, groupChat: groupChat }, (res, err) => {
            ResponseErrorHandle(res, err, `向${groupChat.name}群聊添加新成员发送错误!`, data => {
                const unsubscribe = store.subscribe(() => {
                    Socket.emit('groupChat-add-member', { addresseeId: groupChat.id, data: { groupChat: { id: groupChat.id }, member: selectedList } } as SocketEmitData, () => {
                        const gc = store.getState().groupChatList.find((v) => v.id === groupChat.id)
                        Socket.emit('drawMemberIntoTheGroupChat', { addresseeId: '', data: { groupChat: gc, member: selectedList } } as SocketEmitData)
                        onClose ? onClose() : null
                    })
                    unsubscribe()
                })
                store.dispatch(AddMemberToGroupChat(groupChat, selectedList))
            })
        })
    }

    return (
        <div className='popup-css'>
            <div style={{ position: 'relative', width: '500px', height: '500px', display: 'flex', flexDirection: 'row' }}>
                <div onClick={() => { onClose ? onClose() : null }} style={{ position: 'absolute', top: 0, right: 0, width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '999' }}>
                    <img width={18} src={require('../../static/svg/关闭.svg').default} alt="" />
                </div>
                <div className='add-member-address-list'>
                    {
                        Object.keys(addressList).map((k) => (
                            <div style={{ position: 'relative', width: '100%', display: 'inline-block' }} key={k}>
                                <div style={{ width: '100%', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#8c8c8c' }}>{k}</div>
                                {
                                    addressList[k].map((v) => (
                                        <div className='user-item' onClick={() => { !v.isGroupMember ? onClickUserItem(v.user) : null }} key={v.user.id}>
                                            <Avatar size={40} src={v.user.headImg} style={{ backgroundColor: headColors[v.user.name.length % 10] }} >{v.user.name}</Avatar>
                                            <div className='user-name'>{v.user.name}</div>
                                            {
                                                !v.isGroupMember ? <MyRadio color='#52c41a' checked={isSelected(v.user)} /> : (
                                                    <div style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '10px', color: '#bfbfbf' }}>已加入</div>
                                                )
                                            }
                                        </div>
                                    ))
                                }
                            </div>
                        ))
                    }
                </div>
                <div style={{ width: '10px', height: '100%' }}></div>
                <div style={{ width: '245px', height: '100%', padding: '25px 5px 5px 5px' }}>
                    <div style={{ width: '100%', height: '40px', lineHeight: '40px', fontSize: '16px', fontWeight: 500, color: '#fff' }}>想要拉入群聊的朋友</div>
                    <div className='add-member-list'>
                        {
                            selectedList.map((v, i) => (
                                <div className='user-item' key={v.id}>
                                    <Avatar size={40} src={v.headImg} style={{ backgroundColor: headColors[v.name.length % 10] }} >{v.name}</Avatar>
                                    <div className='user-name'>{v.name}</div>
                                    <img width={16} src={require('../../static/svg/关闭2.svg').default} onClick={() => { onRemoveSelectUserItem(v) }} />
                                </div>
                            ))
                        }
                    </div>
                    <div className='popup-button-column'>
                        <Space direction='horizontal' size={10}>
                            <MyButton onClick={onClickCancel}>取消</MyButton>
                            <MyButton onClick={onClickAdd} buttonColor='#40a9ff'>添加</MyButton>
                        </Space>
                    </div>
                </div>
            </div>
        </div>
    )

}

function GroupChatInfoShow(props: { groupChat: GroupChat, onStartChat?: () => void, onRemoveGroupChat?: () => void, onStartChat?: (target?: NewFriend | GroupChat | User) => void }) {

    const { groupChat, onStartChat, onRemoveGroupChat } = props
    const [gc, setgc] = useState<GroupChat | null>({ ...groupChat })
    const [action, setaction] = useState<'add-member' | 'set-name' | 'exit-group' | 'add-friend' | 'remove-member' | ''>('')
    const [newGcName, setnewGcName] = useState<string | undefined>(gc?.name)
    const [prompt, setprompt] = useState<'来信免搅' | '来信提示'>(store.getState().noPromptList.indexOf(groupChat.id) > -1 ? '来信提示' : '来信免搅')
    const [mypopoverHideArr, setmypopoverHide] = useState<boolean[]>(gc ? Object.keys(gc.users).map(v => false) : [])
    const [authentication, setauthentication] = useState<string>('')//加好友发给对方的验证信息
    const [selectedUser, setselectedUser] = useState<User | null>(null)//选中的群聊的成员

    //修改名字
    function onSubmitNewGcName() {
        const newName = TrimAll(newGcName)
        if (!newName) {
            message.warning('名字还没起呢!')
            return
        }
        SetGroupChatNameService({ id: gc.id, name: newName }, (res, err) => {
            if (err) {
                console.log(err)
            }
            ResponseErrorHandle(res, err, '修改群聊名字发生错误', (data) => {
                store.dispatch(SetGroupChatName({ id: gc.id }, newName))
                Socket.emit('groupChat-set-name', { addresseeId: gc.id, data: { id: gc.id, name: newName } as GroupChat } as SocketEmitData)
                setaction('')
                setnewGcName(newName)
            })
        })
    }

    //退群
    function onExitGroupChat() {
        ExitGroupChatService({ id: gc.id }, { id: store.getState().user.id }, (res, err) => {
            ResponseErrorHandle(res, err, `退出"${gc.name}"群聊发生错误!`, data => {
                store.dispatch(RemoveGroupChat({ id: gc.id }, false))
                Socket.emit('exit-groupChat', { addresseeId: gc.id, data: { groupChat: { id: gc.id }, user: { id: store.getState().user.id } } } as SocketEmitData)
                onRemoveGroupChat ? onRemoveGroupChat() : null
            })
        })
    }

    function onClickSetPrompt() {
        if (prompt === '来信免搅') {
            store.dispatch(AddNoPromptList(gc.id))
            setprompt('来信提示')
        } else {
            store.dispatch(PopNoPromptList(gc.id))
            setprompt('来信免搅')
        }
    }

    //提交好友认证申请
    function submitAuthenticationApply() {
        let nf: NewFriend = { state: FriendState.applying, user: store.getState().user, authentication: authentication, time: new Date() }
        Socket.emit('addFriend', { addresseeId: selectedUser.id, data: nf } as SocketEmitData, () => {
            nf.state = FriendState.await
            nf.user = DeepCopy(selectedUser)
            store.dispatch(PushNewFriend(nf))
            setselectedUser(null)
            setaction('')
            setauthentication('')
        })
    }

    //把群成员踢出群聊
    function submitRemoveMember() {
        ExitGroupChatService({ id: gc.id }, { id: selectedUser.id }, (res, err) => {
            ResponseErrorHandle(res, err, `把${selectedUser.name}踢出群聊发生错误!`, data => {
                const gu = { groupChat: { id: gc.id }, user: { id: selectedUser.id } }
                const chat: Chat = { id: gc.id, type: ChatType.group, newMsg: { senderId: store.getState().user.id, addresseeId: '', msg: `'${selectedUser.name}'被群主踢出群聊.`, type: MsgType.notice, time: Date.now() } }
                Socket.emit('chat', { addresseeId: gc.id, data: chat } as SocketEmitData)
                Socket.emit('remove-groupChat-member', { addresseeId: gc.id, data: gu } as SocketEmitData, () => {
                    store.dispatch(RemoveMemberFromGroupChat(gu))
                    setselectedUser(null)
                    setaction('')
                })
            })
        })
    }


    function myPopoverMenu(gc: GroupChat, user: User, index: number) {

        const me = store.getState().user

        function hist() {
            let newM = [...mypopoverHideArr]
            newM[index] = newM[index] ? false : true
            setmypopoverHide(newM)//隐藏MyPopover
        }

        function onClickSendChat() {
            hist()
            onStartChat ? onStartChat(user) : null
        }

        function onClickAddFriend() {
            hist()
            setselectedUser(user)
            setaction('add-friend')
        }

        function onClickRemoveMember() {
            hist()
            setselectedUser(user)
            setaction('remove-member')
        }

        if (user.id === me.id) {
            return (
                <div style={{ position: 'relative', padding: '5px', borderRadius: '3px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    你要干嘛,自己都点⊙.⊙
                </div>
            )
        }

        return (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5px', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <Space direction='vertical' align='center' size={5}>
                    {
                        IsMyFriend(user, store.getState().addressList) ?
                            <MyButton buttonColor='#40a9ff' onClick={onClickSendChat}>发消息</MyButton>
                            : <MyButton buttonColor='#ffccc7' onClick={onClickAddFriend} >加好友</MyButton>
                    }
                    {
                        gc.creator.id === me.id ? <MyButton onClick={onClickRemoveMember} buttonColor='#f5222d'>踢出群聊</MyButton> : null
                    }
                </Space>
            </div >
        )
    }

    useEffect(() => {
        setmypopoverHide(groupChat ? Object.keys(groupChat.users).map(v => false) : [])
        setgc(DeepCopy(groupChat))
        setprompt(store.getState().noPromptList.indexOf(groupChat.id) > -1 ? '来信提示' : '来信免搅')
    }, [groupChat])

    useEffect(() => {
        const uns = store.subscribe(() => {
            const gc_ = store.getState().groupChatList.find(v => v.id === gc?.id)
            !IsJSONEqual(gc, gc_) ? setgc(DeepCopy(gc_)) : null
        })
        return () => { uns() }
    }, [gc])

    const content = gc ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div className='home-group-member-show'>
                {
                    Object.keys(gc.users).map((key, index) => (
                        <MyPopover hide={mypopoverHideArr[index]} menuContent={myPopoverMenu({ creator: gc.creator }, gc.users[key], index)} key={key}>
                            <Tooltip placement="top" title={gc.users[key].name}>
                                <div style={{ margin: 5, }}><Avatar size={60} src={gc.users[key].headImg} style={{ backgroundColor: headColors[gc.users[key].name.length % 10] }}>{gc.users[key].name}</Avatar></div>
                            </Tooltip>
                        </MyPopover>
                    ))
                }
            </div>
            <div className='group-config'>
                <Space size={5}>
                    <MyButton buttonColor='#40a9ff' onClick={() => { onStartChat ? onStartChat() : null }}>发消息</MyButton>
                    <MyButton buttonColor='#36cfc9' onClick={() => { setaction('add-member') }}>添加成员</MyButton>
                    <MyButton buttonColor='#f759ab' onClick={onClickSetPrompt}>{prompt}</MyButton>
                    <MyButton buttonColor='#52c41a' onClick={() => { setaction('set-name') }}>修改群名</MyButton>
                    <MyButton buttonColor='#f5222d' onClick={() => { setaction('exit-group') }}>我要退群</MyButton>
                </Space>
            </div>
            {
                (() => {
                    switch (action) {
                        case 'add-member':
                            return <GroupChatAddMember groupChat={gc} onClose={() => { setaction('') }} />
                            break;
                        case 'set-name':
                            return (
                                <div className='popup-css'>
                                    <div style={{ position: 'relative', width: '300px', height: '150px', display: 'flex', flexDirection: 'column' }}>
                                        <div onClick={() => { setaction(''); setnewGcName(gc.name) }} style={{ position: 'absolute', top: 0, right: 0, width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '999' }}>
                                            <img width={18} src={require('../../static/svg/关闭.svg').default} alt="" />
                                        </div>
                                        <div style={{ width: '100%', height: '40px', lineHeight: '40px', fontSize: '16px', fontWeight: 500, color: '#fff' }}>要给我起新名字吗?(•‾̑⌣‾̑•)✧˖°</div>
                                        <MyInput focus={true} width={300} height={60} wordLimit={20} value={newGcName} onChange={v => { setnewGcName(v) }} />
                                        <div className='popup-button-column'>
                                            <Space direction='horizontal' size={10}>
                                                <MyButton onClick={() => { setaction(''); setnewGcName(gc.name) }}>取消</MyButton>
                                                <MyButton onClick={onSubmitNewGcName} buttonColor='#40a9ff'>提交</MyButton>
                                            </Space>
                                        </div>
                                    </div>
                                </div>
                            )
                            break;
                        case 'exit-group':
                            return (
                                <div className='popup-css'>
                                    <div style={{ position: 'relative', width: '300px', height: '150px', padding: '5px 0', display: 'flex', flexDirection: 'column' }}>
                                        <div onClick={() => { setaction('') }} style={{ position: 'absolute', top: 0, right: 0, width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '999' }}>
                                            <img width={18} src={require('../../static/svg/关闭.svg').default} alt="" />
                                        </div>
                                        <div style={{ width: '100%', height: '80px', lineHeight: '40px', fontSize: '16px', fontWeight: 500, color: '#fff' }}>你真的那么想离开我们这个集体吗?<br />没有一点留恋ಥ_ಥ</div>
                                        <div className='popup-button-column'>
                                            <Space direction='horizontal' size={10}>
                                                <MyButton onClick={onExitGroupChat}>狠心离开</MyButton>
                                                <MyButton buttonColor='#40a9ff' onClick={() => { setaction('') }}>我还是再想想吧</MyButton>
                                            </Space>
                                        </div>
                                    </div>
                                </div>
                            )
                            break;
                        case 'add-friend':
                            return (
                                <div className='popup-css'>
                                    <div style={{ position: 'relative', width: '300px', height: '150px', display: 'flex', flexDirection: 'column' }}>
                                        <div onClick={() => { setaction(''); setauthentication('') }} style={{ position: 'absolute', top: 0, right: 0, width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '999' }}>
                                            <img width={18} src={require('../../static/svg/关闭.svg').default} alt="" />
                                        </div>
                                        <div style={{ width: '100%', height: '40px', lineHeight: '40px', fontSize: '16px', fontWeight: 500, color: '#fff' }}>告诉对方你是谁,提高通过率.</div>
                                        <MyInput focus={true} width={300} height={60} wordLimit={100} value={authentication} onChange={v => { setauthentication(v) }} />
                                        <div className='popup-button-column'>
                                            <Space direction='horizontal' size={10}>
                                                <MyButton onClick={() => { setaction(''); setauthentication(''); setselectedUser(null) }}>取消</MyButton>
                                                <MyButton onClick={submitAuthenticationApply} buttonColor='#40a9ff'>提交</MyButton>
                                            </Space>
                                        </div>
                                    </div>
                                </div>
                            )
                            break;
                        case 'remove-member':
                            return (
                                <div className='popup-css'>
                                    <div style={{ position: 'relative', width: '300px', height: '150px', padding: '5px 0', display: 'flex', flexDirection: 'column' }}>
                                        <div onClick={() => { setaction('') }} style={{ position: 'absolute', top: 0, right: 0, width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '999' }}>
                                            <img width={18} src={require('../../static/svg/关闭.svg').default} alt="" />
                                        </div>
                                        <div style={{ width: '100%', height: '80px', lineHeight: '40px', fontSize: '16px', fontWeight: 500, color: '#fff' }}>你就这么狠心的把人家踢走?<br />不给对方一点机会(●･̆⍛･̆●)</div>
                                        <div className='popup-button-column'>
                                            <Space direction='horizontal' size={10}>
                                                <MyButton onClick={submitRemoveMember}>狠下心...</MyButton>
                                                <MyButton buttonColor='#40a9ff' onClick={() => { setaction('') }}>给他一次机会吧</MyButton>
                                            </Space>
                                        </div>
                                    </div>
                                </div>
                            )
                            break;
                        default:
                            break;
                    }
                })()
            }
        </div >
    ) : <img width={100} src="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg" alt="" />

    return content
}

function UserInfoShow(props: { user?: User, onStartChat?: () => void, onDeleteFriend: () => {} }) {

    const { user, onStartChat, onDeleteFriend } = props
    const [friend, setfriend] = useState<User | null>(DeepCopy(user))
    const [action, setaction] = useState<'delete-friend' | ''>('')

    useEffect(() => { setfriend(DeepCopy(user)) }, [user])
    useEffect(() => {
        const uns = store.subscribe(() => {
            //判断是否被删除好友
            if (!Object.keys(store.getState().addressList).some(key => store.getState().addressList[key].some(u => u.id === friend.id))) {
                setfriend(null)
            }
        })
        return () => { uns() }
    }, [friend])

    const content = friend ? (
        <div className='home-friend-info-con' >
            <div className='home-friend-info-top'>
                <div className='home-Identity-info'>
                    <div className='home-Identity-username'>{friend.name}</div>
                    <div className='home-Identity-gender'>
                        {
                            friend.gender != GenderEnum.unisex ? (
                                friend.gender == GenderEnum.girl ? < img width={25} src={require('../../static/svg/girl.svg').default} alt="" />
                                    : < img width={25} src={require('../../static/svg/boy.svg').default} alt="" />) : null
                        }
                    </div>
                </div>
                <Avatar size={60} src={friend.headImg} style={{ backgroundColor: headColors[friend.name.length % 10] }}>{friend.name}</Avatar>
            </div>
            <div className='home-encourage-words'> <p style={{ color: 'white' }}>自我勉励:</p>努力变成自己想要的样子 </div>
            <Divider type='horizontal' style={{ margin: '5px 0', borderColor: '#fff' }} />
            <div className='home-friend-info-bottom'>
                {friend.area ? (
                    <Row>
                        <Col span={6}><div className='home-tag-info-title'>地区</div></Col>
                        <Col span={18}><div className='home-tag-info-con'>{friend.area}</div></Col>
                    </Row>
                ) : null}
                <Row>
                    <Col span={6}><div className='home-tag-info-title'>账号</div></Col>
                    <Col span={18}><div className='home-tag-info-con'>{friend.identity}</div></Col>
                </Row>
            </div>
            <Divider type='horizontal' style={{ margin: '5px 0', borderColor: '#fff' }} />
            <div className='home-action-but'>
                <Space size={5}>
                    <MyButton buttonColor='#40a9ff' onClick={() => { onStartChat ? onStartChat() : null }}>发消息</MyButton>
                    <MyButton buttonColor='#f5222d' onClick={() => { setaction('delete-friend') }}>删除聊友</MyButton>
                </Space>
            </div>
            {
                action === 'delete-friend' ? (
                    <div className='popup-css'>
                        <div style={{ position: 'relative', width: '300px', height: '150px', padding: '5px 0', display: 'flex', flexDirection: 'column' }}>
                            <div onClick={() => { setaction('') }} style={{ position: 'absolute', top: 0, right: 0, width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '999' }}>
                                <img width={18} src={require('../../static/svg/关闭.svg').default} alt="" />
                            </div>
                            <div style={{ width: '100%', height: '80px', lineHeight: '40px', fontSize: '16px', fontWeight: 500, color: '#fff' }}>要不给他一次机会(●･̆⍛･̆●)</div>
                            <div className='popup-button-column'>
                                <Space direction='horizontal' size={10}>
                                    <MyButton onClick={onDeleteFriend ? onDeleteFriend : null}>狠下心...</MyButton>
                                    <MyButton buttonColor='#40a9ff' onClick={() => { setaction('') }}>给他一次机会</MyButton>
                                </Space>
                            </div>
                        </div>
                    </div>
                ) : null
            }
        </div>
    ) : null

    return content
}

function InfoShow(props: {
    info?: NewFriend | GroupChat | User | null,
    onRejectUser?: () => void,
    onAcceptFrient?: () => void,
    onRemoveUser?: () => void,
    onStartChat?: (target?: NewFriend | GroupChat | User) => void,
    onRemoveGroupChat?: () => void,
    onDeleteFriend: () => {}
}) {
    const { info, onRejectUser, onAcceptFrient, onRemoveUser, onStartChat, onRemoveGroupChat, onDeleteFriend } = props

    const content = info ? (
        (info as User).identity ? <UserInfoShow user={info as User} onStartChat={onStartChat} onDeleteFriend={onDeleteFriend} /> : (
            (info as GroupChat).creator ? <GroupChatInfoShow groupChat={info as GroupChat} onStartChat={onStartChat} onRemoveGroupChat={onRemoveGroupChat} />
                : <NewFriendInfoShow newFriend={info as NewFriend}
                    onRejectUser={onRejectUser}
                    onAcceptFrient={onAcceptFrient}
                    onRemoveUser={onRemoveUser}
                    onStartChat={onStartChat} />
        )
    ) : (
            <img width={100} src="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg" alt="" />
        )
    return (
        <div className='home-friend-info'>
            {content}
        </div>
    )
}

function getFileIcon(t: MsgType, url: string) {

    const fileTypeMap = new Map<MsgType, string>([[MsgType.zip, 'zip'], [MsgType.word, 'word'], [MsgType.excel, 'excel'], [MsgType.ppt, 'powerpoint'], [MsgType.pdf, 'pdf'], [MsgType.txt, 'text'], [MsgType.xml, 'code']])

    switch (t) {
        case MsgType.img:
            return <Avatar size={25} shape='square' src={url} />
            break;
        case MsgType.music:
            return <Avatar size={25} shape='square' src={require('../../static/img/音乐.png').default} />
            break;
        case MsgType.video:
            return <Avatar size={25} shape='square' src={require('../../static/img/视频.png').default} />
            break;
        case MsgType.unknown:
            return <Avatar size={25} shape='square' src={require('../../static/img/未知文件.png').default} />
            break;
        default:
            return <i className={`fa fa-file-${fileTypeMap.get(t)}-o fa-2x`}></i>
            break;
    }
}

function SendFilesShow(props: { chat: Chat }) {

    const { chat } = props
    const [filesToBeSent, setfilesToBeSent] = useState<{ file: File, type: MsgType, isRemove: boolean }[]>([])
    const [isSending, setisSending] = useState<boolean>(false)

    function addFile(files: FileList) {
        let f = Array.from(files).map(v => ({ file: v, type: GetFileType(v), progress: 0 }))
        setfilesToBeSent(f.concat(filesToBeSent))
    }

    function openScreenshotWindow() {
        OpenModalWin(500, 500, 'screenshotModal', {
            controlMainWindow: true, communication: data => {
                if (data.type == WindowCommunicationType.end && data.data === 'screenshot') {
                    let file = new File([clipboard.readImage().toPNG(0)], `${Date.now()}.jpeg`)
                    setfilesToBeSent([{ file: file, type: MsgType.img, isRemove: false }].concat(filesToBeSent))
                }
            }, fullscreen: true, okShow: true
        })
    }

    function onSendFile() {
        setisSending(true)
        SendMsg(filesToBeSent, chat)
        setTimeout(() => {
            setfilesToBeSent([])
            setisSending(false)
        }, 310);
    }

    function onCancelSendFile() {
        setfilesToBeSent([])
    }

    function onRemoveFile(index: number) {
        let newFilesToBeSent = [...filesToBeSent]
        newFilesToBeSent[index].isRemove = true
        setfilesToBeSent(newFilesToBeSent)
        setTimeout(() => {
            let newFilesToBeSent_ = [...filesToBeSent]
            newFilesToBeSent_.splice(index, 1)
            setfilesToBeSent(newFilesToBeSent_)
        }, 303);
    }

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className='add-file-but' style={{ position: 'relative', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className='fa fa-folder' />
                <input className='upload-input' onChange={v => { addFile(v.target.files) }} type="file" multiple={true} title=' ' />
            </div>
            <div className='screenshot-but' onClick={openScreenshotWindow}>
                <i className='fa fa-scissors' />
            </div>
            {
                filesToBeSent.length > 0 ? (
                    <div className={`files-to-be-sent ${isSending ? 'remove' : ''}`} onMouseMove={e => e.stopPropagation()}>
                        <Space direction='vertical' size={5} style={{ marginBottom: '5px' }}>
                            {
                                filesToBeSent.map((v, index) => (
                                    <div className={`file-to-be-sent ${v.isRemove ? 'remove' : ''}`} key={v.file.name} >
                                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', color: '#fff' }}>
                                            {
                                                getFileIcon(v.type, CreateObjectURL(v.file))
                                            }
                                            <div style={{ width: 'calc(100% - 30px)', padding: '5px', fontSize: '10px', color: '#d9d9d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {v.file.name}
                                            </div>
                                        </div>
                                        <div className='remove-file' onClick={() => { onRemoveFile(index) }}>
                                            <img width={25} src={require('../../static/img/删除.png').default} alt="" />
                                        </div>
                                    </div>
                                ))
                            }
                        </Space>
                        {
                            !isSending ? (
                                <div style={{ width: '100%', height: '22px' }}>
                                    <Space direction='horizontal' size={5}>
                                        <div className='send-file-but' onClick={onSendFile} style={{ width: '92.5px', height: '100%', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <img width={20} src={require('../..//static/svg/发送.svg').default} alt="" />
                                        </div>
                                        <div className='send-file-but' onClick={onCancelSendFile} style={{ width: '92.5px', height: '100%', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <img width={20} src={require('../..//static/svg/关闭.svg').default} alt="" />
                                        </div>
                                    </Space>
                                </div>
                            ) : null
                        }
                    </div>
                ) : null
            }
        </div>

    )
}

function SendEmojiShow(props: { onSelectedEmoji: (emoji: string) => void }) {

    const { onSelectedEmoji } = props
    const emojiWin = useRef<HTMLDivElement>()
    const [emojiType, setemojiType] = useState<'emoji' | 'emoticon'>('emoji')
    // const [emojiMap, setemojiMap] = useState(new Map([['emoji', emoji], ['emoticon', emoticon]]))

    function loseFocus() {
        if (emojiWin.current.classList.contains('open')) {
            emojiWin.current.classList.remove('open')
        }
    }

    function onMouseMove_emojiWin(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.stopPropagation()
        emojiWin.current.onblur = null
    }

    function onMouseOut_emojiWin() {
        emojiWin.current.focus()
        emojiWin.current.onblur = loseFocus
    }

    function openEmojiWin() {
        if (!emojiWin.current.classList.contains('open')) emojiWin.current.classList.add('open')
        emojiWin.current.focus()
        emojiWin.current.onblur = loseFocus
    }

    function selectedEmoji(emoji_: string) {
        if (onSelectedEmoji) onSelectedEmoji(emoji_)
        loseFocus()
    }

    return (
        <div className='emoji-show'>
            <div className='open-emoji-window-but' onClick={openEmojiWin}>
                😃
            </div>
            <div className='open-emoji-window' ref={emojiWin} tabIndex='0' onMouseMove={onMouseMove_emojiWin} onMouseOut={onMouseOut_emojiWin}>
                <div style={{ position: 'absolute', top: 0, left: 0, display: 'inline-block', backgroundColor: '#fff', visibility: emojiType === 'emoji' ? 'visible' : 'hidden' }}>
                    <MyList width={360} height={210} padding={5}>
                        <table style={{ position: 'relative' }}>
                            <tbody>
                                {
                                    chunk(emoji, 17).map((v, i) => (
                                        <tr key={i}>
                                            {
                                                v.map((e, i) => (<td onClick={() => { selectedEmoji(e) }} key={i}>{e}</td>))
                                            }
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </MyList>
                </div>
                <div style={{ position: 'absolute', top: 0, left: 0, display: 'inline-block', backgroundColor: '#fff', visibility: emojiType === 'emoticon' ? 'visible' : 'hidden' }}>
                    <MyList width={360} height={210} padding={5}>
                        <table style={{ position: 'relative', color: '#000' }}>
                            <tbody>
                                {
                                    chunk(emoticon, 5).map((v, i) => (
                                        <tr key={i}>
                                            {
                                                v.map((e, i) => (<td onClick={() => { selectedEmoji(e) }} key={i}>{e}</td>))
                                            }
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </MyList>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, display: 'inline-block' }}>
                    <MyList direction='horizontal' width={360} height={40}>
                        <div className={`emoji-type ${emojiType === 'emoji' ? 'selected' : ''}`} onClick={() => { setemojiType('emoji') }}>
                            😃
                        </div>
                        <div className={`emoji-type ${emojiType === 'emoticon' ? 'selected' : ''}`} onClick={() => { setemojiType('emoticon') }}>
                            ⊙⊙
                        </div>
                    </MyList>
                </div>
            </div>

        </div>
    )
}

function SendVoice(props: { chat: Chat }) {

    const { chat } = props

    //发送语音
    function recordingVoice(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        let rec = Recorder({
            type: 'mp3', sampleRate: 16000, bitRate: 16, onProcess: (buffers: Int16Array[], powerLevel: number, duration: number, sampleRate: number) => {
                window.waveView.input(buffers[buffers.length - 1], powerLevel, sampleRate)
            }
        })
        window.onmouseup = () => {
            if (rec) {
                rec.stop()
                rec.close()
                rec = null
            }
            window.onmouseup = null
        }
        const target = ev.currentTarget
        rec.open(() => {
            rec.start()
            target.onmouseup = (e) => {
                e.stopPropagation()
                rec.stop((blob: Blob, duration: number) => {
                    // console.log(blob, duration)
                    //  blob.arrayBuffer().then(ab => { writeFileSync('D:/chat/Recorder.mp3', new Uint16Array(ab)) })
                    let fileR = new FileReader()
                    fileR.readAsDataURL(blob)
                    fileR.onload = e => {
                        SendMsg([{ data: e.target.result, duration: duration }], chat, MsgType.voice)
                    }
                    rec.close()
                    rec = null
                }, (msg: string, bool: boolean) => {
                    // console.log(msg, bool)
                    rec.close()
                    rec = null
                });
                target.onmouseup = null
            }
        }, (msg: string, bool: boolean) => {
            // console.log(msg, bool)
        })
    }

    useEffect(() => {
        window.waveView = Recorder.FrequencyHistogramView({
            elem: '.wave-view'
            , lineCount: 10
            , position: 0
            , minHeight: 1
            , fallDuration: 400
            , stripeEnable: false
            , mirrorEnable: true
            , linear: [0, "#0ac", 1, "#0ac"]
        })
    }, [])

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <Tooltip placement='bottom' title='长按图标录制语音,松开鼠标发送.移开语音图标后松开鼠标取消发送语音.'>
                <div className='voice-but'>
                    <img width={20} src={require('../../static/img/语音.png').default} alt="" />
                    <div className='voice-send-handle' onMouseDown={recordingVoice}></div>
                </div>
            </Tooltip>
            <div className='wave-view'></div>
        </div>
    )
}

function ChatShow(props: { onSendMsg: (msg: string, msgType: MsgType) => void }) {

    const { onSendMsg } = props
    const list = useRef()
    const [me, setme] = useState({ ...JSON.parse(localStorage.getItem('me')) } as User)
    const [msg, setmsg] = useState<string>('')
    const [chat, setchat] = useState<Chat | null>(store.getState().currentChat ? { ...store.getState().currentChat } : null)
    const [showMsgCount, setshowMsgCount] = useState<number>(chat ? (chat.msgs.length >= 10 ? 10 : chat.msgs.length) : 0)//当前显示的消息条数
    const [isRemoveMsg, setisRemoveMsg] = useState(false)//用于记录是否发生了移除消息事件,用于判断chat的改变是删除消息引起的,而不是来新消息,消息窗口不需要滚动到底部查看新消息

    function onClickSendMsg() {
        const m = msg.trim()
        if (m !== '') {
            onSendMsg ? onSendMsg(TestToHtml(m), MsgType.text) : null
            setmsg('')
        }
    }

    //打开音乐列表窗口
    function openMusicListWindow(fileInfo: FileInfo) {
        const modal = OpenModalWin(366, 650, 'musicModal', {
            followParent: true,
            communication: data => { if (data.type == WindowCommunicationType.start) { modal.initData(fileInfo) } },
            controlMainWindow: true,
            windowName: 'music-modal'
        })
    }

    //打开视频列表窗口
    function openVideoListWindow(fileInfo: FileInfo) {
        const modal = OpenModalWin(500, 500, 'videoModal', {
            followParent: true,
            communication: data => { if (data.type == WindowCommunicationType.start) { modal.initData(fileInfo) } },
            controlMainWindow: true,
            windowName: 'video-modal'
        })
    }

    //打开视频通话窗口
    function openVideoCallWindow() {
        if (Object.values(VideoCallWindowNames).length > 0) {
            message.warning('当前正在视频通话中,挂断后才可以拨号.')
            return
        }
        const caller = chat.users[chat.id]
        const modal = OpenModalWin(960, 540, 'videoCallModal', {
            followParent: false,
            communication: data => {
                if (data.type == WindowCommunicationType.start) {
                    modal.initData({ me: me, caller: caller })
                    return
                }
                if (typeof data.data === 'string') data.data = JSON.parse(data.data)
                if (data.type == WindowCommunicationType.close || data.type == WindowCommunicationType.end) {
                    delete VideoCallWindowNames[caller.id]
                    return
                }
                if (data.type == WindowCommunicationType.communication) Socket.emit('video-call', data.data)
            },
            controlMainWindow: true
        })

        VideoCallWindowNames[caller.id] = modal
    }

    //打开语音通话窗口
    function openVoiceCallWindow() {
        if (Object.values(VoiceCallWindowNames).length > 0) {
            message.warning('当前正在通话中,挂断后才可以拨号.')
            return
        }
        const caller = chat.users[chat.id]
        const modal = OpenModalWin(300, 250, 'voiceCallModal', {
            followParent: false,
            communication: data => {
                if (data.type == WindowCommunicationType.start) {
                    modal.initData({ me: me, caller: caller })
                    return
                }
                if (typeof data.data === 'string') data.data = JSON.parse(data.data)
                if (data.type == WindowCommunicationType.close || data.type == WindowCommunicationType.end) {
                    delete VoiceCallWindowNames[caller.id]
                    return
                }
                if (data.type == WindowCommunicationType.communication) Socket.emit('voice-call', data.data)
            },
            controlMainWindow: true
        })

        VoiceCallWindowNames[caller.id] = modal
    }

    //打开文件
    function openFile(fileInfo: FileInfo) {
        shell.openPath(fileInfo.path)
    }

    //获取消息需要显示的表示发送状态的UI
    function getMsgStateIcon(state: MsgState) {
        let content = null
        if (state == MsgState.sending) {
            content = (<div className="circle-border"><div className="circle-core" /></div>)
        } else if (state == MsgState.fail) {
            content = (<img width={20} src={require('../../static/img/error.png').default} alt=" " />)
        }
        return content
    }

    //播放语音消息
    function playingVoice() {
        const audio = new Audio()
        let target: Element = null
        function onpause() {
            target.classList.remove('playing')
            target = null
            audio.removeEventListener('pause', onpause)
        }
        return (ev: React.MouseEvent<HTMLDivElement, MouseEvent>, msg: Msg) => {
            if (target) {
                audio.removeEventListener('pause', onpause)
                target.classList.remove('playing')
            }
            const voiceInfo: { data: string, duration: number, path: string } = msg.msg
            target = ev.currentTarget.classList.contains('voice-msg') ? ev.currentTarget : ev.currentTarget.closest('.voice-msg')
            if (target) {
                target.classList.add('playing')
                audio.pause()
                audio.src = voiceInfo.data
                audio.addEventListener('pause', onpause)
                audio.play()
            }
        }
    }

    const playingvoice = useMemo(() => playingVoice(), [])

    //根据信息类型获取信息UI
    function getMsgUI(type: MsgType, chatId: string): (msg: Msg) => any {

        function downloadFile(msg: Msg) {
            const fileInfo: FileInfo = msg.msg
            DownloadFileService(fileInfo.url, fileInfo.name, (p) => {
                store.dispatch(UpdateChatMsg({ chatId: chatId, msgId: msg.id, progress: p }))
            }, (path, err) => {
                let fileInfo: FileInfo = DeepCopy(msg.msg)
                fileInfo.path = path
                fileInfo.type = ''
                store.dispatch(UpdateChatMsg({ chatId: chatId, msgId: msg.id, msg: fileInfo }))
            })
        }

        const textUI = (item: Msg) => (<div className='chat-msg-text'>{item.msg}</div>)
        const imgUI = (item: Msg) => (
            <div className={`home-img-ui ${item.senderId === me.id ? 'right' : 'left'}`}>
                <img height={60} onClick={() => Zmage.browsing({ src: item.msg.url })} src={item.msg.url} alt="" />
            </div>
        )
        const musicUI = (item: Msg) => (
            <div style={{ position: 'relative', width: '250px', display: 'inline-block' }}>
                <div style={{ width: `${item.progress}%`, position: 'absolute', top: 0, left: 0, height: '60px', borderRight: '5px', backgroundColor: 'rgba(0,0,0,0.3)' }} />
                <MyAudio src={item.msg.url} name={item.msg.name} />
                <table className='chat-music-control'>
                    <tbody>
                        <tr>
                            {/* {console.log(`p:${item.progress};senderId:${item.senderId};meId:${me.id}`)} */}
                            {item.progress === 0 && item.senderId !== me.id ? <td><i onClick={() => { downloadFile(item) }} className="fa fa-download" /></td> : null}
                            <td><i onClick={() => { openMusicListWindow(item.msg as FileInfo) }} className="fa fa-bars" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        )
        const videoUI = (item: Msg) => (
            <div style={{ position: 'relative', display: 'inline-flex', padding: '5px' }}>
                <div style={{ width: `${item.progress}%`, position: 'absolute', top: 0, left: 0, height: '100%', borderRight: '5px', backgroundColor: 'rgba(0,0,0,0.3)' }} />
                <video src={item.msg.url} height={100} />
                <table className='chat-video-control'>
                    <tbody>
                        <tr>
                            {item.progress === 0 && item.senderId !== me.id ? <td><i onClick={() => { downloadFile(item) }} className="fa fa-download" /></td> : null}
                            <td><i onClick={() => { openVideoListWindow(item.msg as FileInfo) }} className="fa fa-play" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>)
        const fileUI = (item: Msg) => (
            <div className='file-to-be-sent' onClick={() => { item.progress === 0 ? downloadFile(item) : openFile(item.msg as FileInfo) }}>
                <div className='file-sent-progress' style={{ width: `${item.progress}%` }} />
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    {getFileIcon(item.type)}
                    <div style={{ width: 'calc(100% - 30px)', padding: '5px', fontSize: '10px', color: '#d9d9d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.msg.name}
                    </div>
                </div>
            </div>
        )
        const voiceUI = (item: Msg,) => (
            <div className={`voice-msg ${item.senderId !== me.id ? 'left' : ''}`} onClick={(e) => { playingvoice(e, item) }}>
                {item.msg.duration > 100 ? `${round(item.msg.duration / 1000, 1)}''` : `''`}
                <div className='playing-icon'>
                    <div className='zero'></div>
                    <div className='one'></div>
                    <div className='two'></div>
                    <div className='three'></div>
                    <div className='four'></div>
                </div>
            </div>
        )
        const map = new Map([[MsgType.text, textUI], [MsgType.img, imgUI], [MsgType.music, musicUI], [MsgType.video, videoUI], [MsgType.voice, voiceUI]])
        const UI = map.get(type)
        return UI ? UI : fileUI
    }

    //获取msg的MyPopover的菜单UI
    function getMsgPopoverUI(item: Msg) {

        function canBeWithdraw() {
            if (Date.now() - item.time < 30000 && item.senderId === me.id && item.state == MsgState.success) {
                return <MyButton onClick={() => { SendMsg([item.id], chat, MsgType.withdraw) }} buttonColor='#91d5ff'>撤回</MyButton>
            }
        }

        //打开文件所在的文件夹并选中文件
        function showItemInFolder() {
            shell.showItemInFolder(item.msg.path.replaceAll("\/", "\\"))
        }

        //转发消息
        function relayMsg() {
            const modal = OpenModalWin(500, 500, 'relayMsgModal', {
                followParent: true,
                communication: data => {
                    if (data.type == WindowCommunicationType.start) {
                        modal.initData({ me: store.getState().user, addressList: store.getState().addressList, groupChatList: store.getState().groupChatList })
                        return
                    }
                    if (data.type == WindowCommunicationType.close) return
                    const value: Chat[] = data.data
                    if (!IsFileMsg(item.type) || item.senderId !== me.id) {
                        value.forEach(v => { SendMsg([item.msg], v, item.type) })
                    } else {
                        const fileInfo: FileInfo = item.msg
                        RelayMyFile(item.msg, value, item.type)
                    }
                }
            })

        }

        //删除消息
        function removeMsg() {
            store.dispatch(RemoveMsg({ chatId: chat.id, msgId: item.id }))
            setisRemoveMsg(true)
            if (showMsgCount >= 10) {
                setshowMsgCount(showMsgCount => showMsgCount - 1)
            }
        }

        //因为每次右击弹出MyPopover都要刷新菜单UI(撤回功能具有时效性),所以返回一个方法
        return () => (
            <div className='msg-popover-menu'>
                <Space size={2} direction='vertical' align='center'>
                    {canBeWithdraw()}
                    {item.state == MsgState.success ? < MyButton onClick={relayMsg} buttonColor='#bae637'>转发</MyButton> : null}
                    {IsFileMsg(item.type) && item.msg.path ? < MyButton onClick={showItemInFolder} buttonColor='#5cdbd3'>位置</MyButton> : null}
                    <MyButton onClick={removeMsg} buttonColor='#ff4d4f'>删除</MyButton>
                </Space>
            </div >
        )
    }

    let loadingTimeout = null
    let loadingResolve = null
    //必须要在组件刷新前执行(也就是必须放在更新state的函数前执行),因为组件刷新后会重置timeout和resolve
    function endLoadingMsg() {
        if (loadingResolve) loadingResolve()
        if (loadingTimeout) clearTimeout(loadingTimeout)
    }
    //加载消息
    function loadingMsg(): Promise<any> {
        let len = chat.msgs.length
        let msgs: Msg[] = []
        if (len > showMsgCount && showMsgCount + 10 >= len) {
            msgs = LoadingMsgData(store.getState().user.id, chat.id)
            if (msgs.length > 0) {
                msgs = msgs.concat(chat.msgs)
                len = msgs.length
            }
        }
        len = showMsgCount + 10 >= len ? len : showMsgCount + 10
        let chat_ = { ...chat }
        if (msgs.length > 0) chat_.msgs = msgs
        return new Promise((ok, no) => {
            loadingResolve = ok
            loadingTimeout = setTimeout(() => {
                store.dispatch(SetChat(chat_))
                setshowMsgCount(len)
                ok()
            }, 3000);
        })
    }

    useLayoutEffect(() => {
        setisRemoveMsg(isRemoveMsg => {
            if (!isRemoveMsg && list.current) list.current.goBottom()
            return false
        })
    }, [chat])

    useEffect(() => {
        const uns = store.subscribe(() => {
            const currentChat = store.getState().currentChat
            if (!IsJSONEqual(chat, currentChat)) {
                if (chat?.id !== currentChat?.id) {
                    endLoadingMsg()
                    const len = currentChat ? (currentChat.msgs.length >= 10 ? 10 : currentChat.msgs.length) : 0
                    setshowMsgCount(len)
                } else if (currentChat && 10 >= currentChat.msgs.length) {
                    setshowMsgCount(currentChat.msgs.length)
                }
                setchat((currentChat ? DeepCopy(currentChat) : null))
            }
            me.id !== store.getState().user?.id ? setme(DeepCopy(store.getState().user)) : null
        })
        return () => { uns() }
    }, [chat, me])

    const content = chat ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }} >
            <Space direction='horizontal' align='center' size={5} style={{ marginLeft: 5, height: '35px' }}>
                <Avatar size={20} src={chat.headImg} style={{ backgroundColor: headColors[chat.name.length % 10] }}>{chat.name}</Avatar>
                <div className='nav-username'>{chat.name}</div>
            </Space>
            <div className='home-chat'>
                <MyList ref={list} direction='vertical' padding={5} onLoading={loadingMsg} allow={showMsgCount !== chat.msgs.length} width='100%' height='100%' modes={['upLoading']}>
                    {
                        chat.msgs.slice(chat.msgs.length - showMsgCount > 0 ? chat.msgs.length - showMsgCount : 0).map((item, index) => {
                            switch (item.type) {
                                case MsgType.notice:
                                    return (
                                        <div className='msg-notice-ui' key={index}>
                                            {item.msg}
                                        </div>
                                    )
                                    break;
                                case MsgType.withdraw:
                                    return (
                                        <div className='msg-withdraw-ui' key={index}>
                                            {`${item.senderId === me.id ? '你' : chat.users[item.senderId].name}撤回了一条消息 `}
                                            {
                                                (() => {
                                                    if (Date.now() - item.time > 60000) {
                                                        localStorage.removeItem(item.id)
                                                    }
                                                    const msgObj: Msg = JSON.parse(localStorage.getItem(item.id))
                                                    if (item.type == MsgType.text && msgObj) {
                                                        return (
                                                            <div onClick={() => { setmsg(msg + msgObj.msg) }} style={{ color: '#69c0ff' }}>重新编辑</div>
                                                        )
                                                    }
                                                })()
                                            }
                                        </div>
                                    )
                                    break;
                                default:
                                    return (
                                        <div className={item.senderId === me.id ? 'chat-right-message' : 'chat-left-message'} key={index}>
                                            <Avatar size={40} src={chat.users[item.senderId].headImg} style={{ marginTop: '10px', backgroundColor: headColors[chat.users[item.senderId].name.length % 10] }}>{chat.users[item.senderId].name}</Avatar>
                                            <div className='chat-username-and-info'>
                                                <div className='chat-username'>{chat.users[item.senderId].name}</div>
                                                <div className='chat-info'>
                                                    <div className={`chat-info-con ${[MsgType.text, MsgType.voice].indexOf(item.type) === -1 ? 'background-transparent' : ''}`}>
                                                        <MyPopover menuContent={getMsgPopoverUI(item)}>
                                                            {
                                                                getMsgUI(item.type, chat.id)(item)
                                                            }
                                                        </MyPopover>
                                                        <div className='msg-state-icon'>
                                                            {
                                                                getMsgStateIcon(item.state)
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                    break;
                            }
                        })
                    }
                </MyList>
            </div>
            <div className='home-send-msg'>
                <div className='home-send-different-thing'
                    onMouseMove={e => {
                        if (!e.currentTarget.classList.contains('show-thing')) e.currentTarget.classList.add('show-thing')
                    }}
                    onMouseOut={e => {
                        if (e.currentTarget.classList.contains('show-thing')) e.currentTarget.classList.remove('show-thing')
                    }}
                >
                    <img width={20} src={require('../../static/svg/添加文件.svg').default} alt="" />
                    <div className='thing-type-list'>
                        <table>
                            <tbody>
                                <tr><td><SendFilesShow chat={{ id: chat.id, type: chat.type }} /></td></tr>
                                <tr><td><SendEmojiShow onSelectedEmoji={(v) => { setmsg(msg + v) }} /></td></tr>
                                <tr>
                                    <td>
                                        <div onClick={chat.type == ChatType.private ? openVideoCallWindow : null} className='video-call-but'>
                                            <img width={20} src={require('../../static/img/视频通话.png').default} alt="" />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div onClick={chat.type == ChatType.private ? openVoiceCallWindow : null} className='voice-call-but'>
                                            <img width={20} src={require('../../static/img/语音通话.png').default} alt="" />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <SendVoice chat={{ id: chat.id, type: chat.type }} />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className='home-msg-input'><MyInput value={msg} onChange={v => { setmsg(v) }} width='100%' wordLimit={300} /></div>
                <div className='home-send-but' onClick={onClickSendMsg}>
                    <img width={25} src={require('../..//static/svg/发送.svg').default} alt="" />
                </div>
            </div>
        </div >
    ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img width={100} src="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg" alt="" />
            </div>
        )

    return content
}

export default function Home(props: IHomeProps) {
    const [me, setme] = useState({ ...JSON.parse(localStorage.getItem('me')) } as User)
    const [currentSelectedAddressItem, setcurrentSelectedAddressItem] = useState<NewFriend | GroupChat | User | null>(null)
    const [currentChat, setcurrentChat] = useState<Chat | null>(store.getState().currentChat ? { ...store.getState().currentChat } : null)
    const [loading, setloading] = useState<boolean>(false)//全局加载的加载状态控制
    const [exit, setexit] = useState<boolean>(false)
    const [noAction, setnoAction] = useState<boolean>(false)//用于显示modalWin后控制主窗口不可操作
    const [showPageNum, setshowPageNum] = useState<number>(0)
    const [unreadNews, setunreadNews] = useState<{ [chatId: string]: number }>({ ...store.getState().unreadNews })
    const [unreadNewFriendNews, setunreadNewFriendNews] = useState<{ [userId: string]: number }>({ ...store.getState().unreadNewFriendNews })

    function switchingAction(index: number) {
        setshowPageNum(index)
    }

    //删除聊友
    function deleteFriend() {
        const friend: User = currentSelectedAddressItem
        DeleteFriendService({ id: me.id }, { id: friend.id }, (res, err) => {
            ResponseErrorHandle(res, err, '删除聊友发生错误!', data => {
                Socket.emit('addFriend', { addresseeId: friend.id, data: { state: FriendState.deleted, user: me, authentication: '', time: new Date() } as NewFriend } as SocketEmitData)
                store.dispatch(RemoveFriend({ id: friend.id }, false))
                setcurrentSelectedAddressItem(null)
            })
        })
    }

    //退出群聊后移除
    function removeGroupChat() {
        /*移除逻辑在GroupChatInfoShow组件*/
        setcurrentSelectedAddressItem(null)
    }

    //拒绝通过新朋友验证
    function rejectNewFriend(nf_ = currentSelectedAddressItem) {
        let nf = DeepCopy(nf_) as NewFriend
        Socket.emit('addFriend', { addresseeId: nf.user.id, data: { authentication: '', state: FriendState.rejected, user: me, time: new Date() } as NewFriend } as SocketEmitData, () => {
            nf.state = FriendState.reject
            store.dispatch(PushNewFriend(nf))
            setcurrentSelectedAddressItem(nf)
        })
    }

    //拒绝通过新朋友验证后点击了移除
    function removeUser(nf_ = currentSelectedAddressItem) {
        let nf = DeepCopy(nf_) as NewFriend
        setcurrentSelectedAddressItem(null)
        store.dispatch(RemoveNewFriend(nf))
    }

    //通过新朋友验证
    function acceptNewFriend(nf_ = currentSelectedAddressItem) {
        let nf: NewFriend = DeepCopy(nf_)
        AddFriendService({ id: me.id }, { id: nf.user.id }, (res, err) => {
            ResponseErrorHandle(res, err, '通过新朋友验证发生错误!', data => {
                Socket.emit('addFriend', { addresseeId: nf.user.id, data: { authentication: '', state: FriendState.passed, user: me, time: new Date() } as NewFriend } as SocketEmitData, () => {
                    nf.state = FriendState.pass
                    store.dispatch(PushNewFriend(nf))
                    store.dispatch(PushFriend(nf.user))
                    setcurrentSelectedAddressItem(nf)
                })
            })
        })
    }

    //发起聊天
    function startChat(target: NewFriend | GroupChat | User = currentSelectedAddressItem) {
        const user = (target as User)
        const groupChat = (target as GroupChat)
        const newFriend = (target as NewFriend)
        const index = user.identity ? 0 : (groupChat.creator ? 1 : 2)
        let chat: Chat
        let users: { [userId: string]: User } = {}
        switch (index) {
            case 0:
                users[me.id] = me
                users[user.id] = { ...user }
                chat = { id: user.id, type: ChatType.private, name: user.name, headImg: user.headImg, users: users, msgs: [] }
                break;
            case 1:
                chat = { id: groupChat.id, type: ChatType.group, name: groupChat.name, headImg: '', users: groupChat.users, msgs: [] }
                break;
            default:
                users[me.id] = me
                users[newFriend.user.id] = { ...newFriend.user }
                chat = { id: newFriend.user.id, type: ChatType.private, name: newFriend.user.name, headImg: newFriend.user.headImg, users: users, msgs: [] }
                break;
        }
        store.dispatch(PushChat(chat))
        if (unreadNews[chat.id]) {
            store.dispatch(SetHaveRead(chat.id, 'chat-news'))
        }
        switchingAction(0)//切换到聊天界面
    }

    //发送消息
    function sendMsg(msg: string, msgType: MsgType) {
        SendMsg([msg], currentChat, MsgType.text)
    }

    //打开搜索账号加朋友的modal窗口
    function onClickAddFrient() {
        let newAL: { [initials: string]: User[] } = {}
        for (const key of Object.keys(store.getState().addressList)) {
            newAL[key] = store.getState().addressList[key].map(u => ({ id: u.id }))
        }
        const modal = OpenModalWin(500, 60, 'identitySearchModal', {
            followParent: false,
            windowName: 'identitySearchModal',
            communication: data => {
                if (data.type == WindowCommunicationType.start) {
                    modal.initData({ addressList: newAL, me: me })
                    return
                }
                if (data.type == WindowCommunicationType.close) return
                const ua: { user: User, authentication: string } = data.data
                if (IsMyFriend(ua.user, newAL)) {
                    startChat(ua.user)
                    return
                }
                let nf: NewFriend = { state: FriendState.applying, user: me, authentication: ua.authentication, time: new Date() }
                Socket.emit('addFriend', { addresseeId: ua.user.id, data: nf } as SocketEmitData, () => {
                    nf.state = FriendState.await
                    nf.user = DeepCopy(ua.user)
                    store.dispatch(PushNewFriend(nf))
                })
            }

        })

    }

    //打开创建群聊的modal窗口
    function onClickCreateGroupChat() {
        const modal = OpenModalWin(500, 500, 'createGroupChatModal', {
            followParent: true,
            communication: data => {
                if (data.type == WindowCommunicationType.start) {
                    modal.initData({ me: store.getState().user, addressList: store.getState().addressList })
                    return
                }
                if (data.type == WindowCommunicationType.close) return
                const gc: GroupChat = data.data
                if (gc.creator) {
                    store.dispatch(PushGroupChat(gc))
                    Socket.emit('drawMemberIntoTheGroupChat', { addresseeId: '', data: { groupChat: gc } } as SocketEmitData, () => {
                        Socket.emit('joinGroupChat', { addresseeId: '', data: gc.id } as SocketEmitData, () => {
                            startChat(gc)
                        })
                    })
                }
            }
        })
    }

    //打开音乐播放窗口
    function openMusicModal() {
        OpenModalWin(366, 650, 'musicModal', { followParent: true, controlMainWindow: true, windowName: 'music-modal' })
    }

    //打开视频播放窗口
    function openVideoModal() {
        OpenModalWin(500, 500, 'videoModal', { followParent: true, controlMainWindow: true, windowName: 'video-modal' })
    }

    //打开设置头像的modal窗口
    function onClickSetHeadImg() {
        const modal = OpenModalWin(472, 382, 'setHeadImgModal', {
            followParent: true,
            communication: data => {
                if (data.type == WindowCommunicationType.start) {
                    modal.initData({ me: store.getState().user })
                    return
                }
                if (data.type == WindowCommunicationType.close) return
                store.dispatch(UpdataUser(data.data as User))
            }

        })
    }

    //退出账号
    function onClickSignOut() {
        let state = store.getState()
        delete state.user
        try {
            SaveStateData(me.id, state)
        } catch (error) {
            // console.log(err)
        }
        Socket.emit('off-line', '', () => {
            ipcRenderer.send('logout')
        })
    }

    //退出程序
    function exitApp() {
        ipcRenderer.send('exit-app')
    }

    //初始化
    function initHome(): () => void {
        const loginFinishAction = (state: StateType) => {
            store.dispatch(InitState(state))
            Socket.emit('on-line', { addresseeId: '', data: me.id } as SocketEmitData)//告诉服务器已经登录完成,可以设置为在线状态
            if (state.groupChatList) {
                const gcIds = state.groupChatList.map((v, i) => v.id)
                Socket.emit('joinGroupChat', { addresseeId: '', data: gcIds } as SocketEmitData)//进入所有加入的群聊房间
            }
            Socket.on('be-occupied', (dtat, cb) => {
                notification['info']({
                    message: '账号异处设备登录提示',
                    description: '账号被二次登录,此处登录将被注销,程序15秒后自动退出.如非在本人知情下操作,请使用邮箱验证登录后修改密码!',
                    duration: 15,
                })
                setexit(true)
                Socket.removeListener('be-occupied')
                cb ? cb() : null
            })
        }

        store.dispatch(InitUser({ ...JSON.parse(localStorage.getItem('me')) } as User))
        ipcRenderer.send('create-tray')//创建应用系统托盘

        setTimeout(() => {
            const identityDate = null
            // const identityDate = GetIdentityData(me.id)
            // if (identityDate) {
            //     store.dispatch(InitState(identityDate.state))
            //     if (432000000 >= (Date.now() - identityDate.lastTime)) loginFinishAction(identityDate.state)
            // }
            //本地没此用户数据或最近一次登出在5天前,需要从后台加载数据来更新旧数据
            if (!identityDate || (Date.now() - identityDate.lastTime) >= 432000000) {
                setloading(true)
                GetChatDataService({ id: me.id } as User, (res, err) => {
                    setloading(false)
                    ResponseErrorHandle(res, err, '初始化Chat失败!', data => { loginFinishAction(data as StateType) })
                })
            }
        }, 1000);

        //用于控制打开modal窗口后,不可操作主窗口
        const openMWListener = () => { setnoAction(true) }
        ipcRenderer.on('open-modal-win', openMWListener)
        const closeMWListener = () => { setnoAction(false) }
        ipcRenderer.on('close-modal-win', closeMWListener)

        return () => {
            ipcRenderer.removeListener('open-modal-win', openMWListener)
            ipcRenderer.removeListener('close-modal-win', closeMWListener)
            Socket.removeListener('be-occupied')
            store.dispatch(ResetState())
        }
    }

    //点击禁止操作的主窗口播放提示音
    let audio
    function NoActiveTips() {
        if (!audio) {
            audio = new Audio(require('../../static/sound/禁止操作提示音.mp3').default)
        }
        audio.play()
    }

    useEffect(() => {
        const uninstall = initHome()
        return () => { uninstall() }
    }, [])

    useEffect(() => {
        const uns = store.subscribe(() => {
            const [id, id2] = [currentChat ? currentChat.id : '', store.getState().currentChat ? store.getState().currentChat.id : '']
            !IsJSONEqual(id, id2) ? setcurrentChat(store.getState().currentChat ? DeepCopy(store.getState().currentChat) : null) : null
            !IsJSONEqual(unreadNews, store.getState().unreadNews) ? setunreadNews(DeepCopy(store.getState().unreadNews)) : null
            !IsJSONEqual(unreadNewFriendNews, store.getState().unreadNewFriendNews) ? setunreadNewFriendNews(DeepCopy(store.getState().unreadNewFriendNews)) : null
            !IsJSONEqual(me, store.getState().user) ? setme(DeepCopy(store.getState().user)) : null
        })
        return () => { uns() }
    }, [currentChat, unreadNews, unreadNewFriendNews, me])

    return (
        <div className='home'>
            <Loading text='初始化数据' size={13} color='#d3f261' loading={loading} />
            <div className='home-con'>
                <div className='home-con-left'>
                    <div className={`home-con-left-con ${showPageNum !== 0 ? 'home-con-hide' : ''}`}>
                        <ChatsList onSelectListItem={chat => { setcurrentChat(chat) }} />
                    </div>
                    <div className={`home-con-left-con ${showPageNum !== 1 ? 'home-con-hide' : ''}`}>
                        <AddressList
                            onSelectListItem={item => { setcurrentSelectedAddressItem(item) }}
                            onRejectUser={rejectNewFriend}
                            onAcceptFrient={acceptNewFriend}
                            onRemoveNewFriend={removeUser} />
                    </div>
                </div>
                <div className='home-con-right'>
                    <Nav height={35} />
                    <div className={`home-con-right-con ${showPageNum !== 0 ? 'home-con-hide' : ''}`}>
                        <ChatShow onSendMsg={sendMsg} />
                    </div>
                    <div className={`home-con-right-con ${showPageNum !== 1 ? 'home-con-hide' : ''}`}>
                        <InfoShow info={currentSelectedAddressItem}
                            onRejectUser={rejectNewFriend}
                            onAcceptFrient={acceptNewFriend}
                            onRemoveUser={removeUser}
                            onStartChat={(v) => { startChat(v) }}
                            onRemoveGroupChat={removeGroupChat}
                            onDeleteFriend={deleteFriend} />
                    </div>
                </div>
            </div>
            <div className='home-action'>
                <Space direction='horizontal' size={10}>
                    <div onClick={() => { switchingAction(0) }}>
                        <Badge count={Object.keys(unreadNews).reduce((pv, cv) => (unreadNews[cv] + pv), 0)} style={{ transform: 'scale(0.7)' }}>
                            <Avatar shape="square" className='home-action-item' size={34} src={require('../../static/svg/消息.svg').default} />
                        </Badge>
                    </div>
                    <div onClick={() => { switchingAction(1) }}>
                        <Badge count={Object.keys(unreadNewFriendNews).reduce((pv, cv) => (unreadNewFriendNews[cv] + pv), 0)} style={{ transform: 'scale(0.7)' }}>
                            <Avatar shape="square" className='home-action-item' size={34} src={require('../../static/svg/通讯录.svg').default} />
                        </Badge>
                    </div>
                    <div onClick={onClickAddFrient}><Avatar shape="square" className='home-action-item' size={40} src={require('../../static/svg/添加好友.svg').default} /></div>
                    <div onClick={onClickCreateGroupChat}><Avatar shape="square" className='home-action-item' size={34} src={require('../../static/svg/群聊.svg').default} /></div>
                    <Popover title={me.name} trigger='click' content={
                        <div>
                            <Space direction='vertical' size={5}>
                                <Space size={5}>
                                    <MyButton buttonColor='#69c0ff' onClick={onClickSetHeadImg}>设置头像</MyButton>
                                    <MyButton buttonColor='#bfbfbf' onClick={onClickSignOut}>退出账号</MyButton>
                                </Space>
                                <Space size={5}>
                                    <MyButton buttonColor='#fa541c' onClick={openMusicModal}>音乐播放</MyButton>
                                    <MyButton buttonColor='#bae637' onClick={openVideoModal}>视频播放</MyButton>
                                </Space>
                            </Space>
                        </div>
                    }>
                        <Avatar shape="square" size={34} src={me.headImg} style={{ backgroundColor: headColors[3] }}>{me.name}</Avatar>
                    </Popover>
                </Space>
            </div>
            {
                exit ? (
                    <div style={{ position: 'fixed', width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MyCountDown second={15} size='middle' onComplete={exitApp} />
                    </div>
                ) : null
            }
            {
                noAction ? (
                    <div onClick={NoActiveTips} style={{ position: 'fixed', width: '100vw', height: '100vh' }} />
                ) : null
            }
        </div>
    );
}
