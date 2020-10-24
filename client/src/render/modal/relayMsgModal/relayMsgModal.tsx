import React, { useState } from 'react'
import ReactDom from 'react-dom'
import { MySearch, MyButton, MyRadio } from '../../components/components'
import { Avatar, Space, message } from 'antd'
import { User, GroupChat, ChatType, Chat, WindowCommunicationData, WindowCommunicationType } from '../../net/model'
import { useModal } from '../useModal'
import '../../static/scss/main.scss'
import './relayMsgModal.scss'

//头像背景色
const headColors = ['#ff7875', '#bae637', '#ffec3d', '#36cfc9', '#40a9ff', '#597ef7', '#9254de', '#eb2f96', '#ffe58f', '#eaff8f']
let me: User
const selectedSet = new Set()

function Modal() {

    const [addressList, setaddressList] = useState<{ [initials: string]: User[] }>({})
    const [groupChatList, setgroupChatList] = useState<GroupChat[]>([])
    const [selectedList, setselectedList] = useState<any[]>([])
    const { closeModal } = useModal({
        onInitData: data => {
            setaddressList(data.data.addressList)
            setgroupChatList(data.data.groupChatList)
            me = data.data.me
        }
    })

    function isSelected(value: any) {
        return selectedSet.has(value)
    }

    function onClickUserItem(value: any) {
        selectedSet.has(value) ? selectedSet.delete(value) : selectedSet.add(value)
        setselectedList([...selectedSet])
    }

    function onRemoveSelectUserItem(value: any) {
        if (selectedSet.has(value)) {
            selectedSet.delete(value)
            setselectedList([...selectedSet])
        }
    }

    function onClickCancel() {
        selectedSet.clear()
        setselectedList([])
    }

    function onClickCreate() {
        if (selectedSet.size < 1) {
            message.warning('还没有选中转发的聊天!')
            return
        }
        const data = [...selectedSet].map(v => {
            const chatType = (v as GroupChat).creator ? ChatType.group : ChatType.private
            return { id: v.id, type: chatType } as Chat
        })
        closeModal(data)

    }

    return (
        <div className='modal-win'>
            <div className='modal-nav' style={{ position: 'relative', width: '100%', height: '20px', backgroundColor: '#f5f5f5' }}>
                <div className='close-but' onClick={() => { closeModal() }}>
                    <img width={20} src={require('../../static/svg/关闭.svg').default} />
                </div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 20px)', display: 'flex', flexDirection: 'row' }}>
                <div style={{ position: 'relative', width: '50%', height: '100%', borderRight: 'solid #d9d9d9 0.5px' }}>
                    <div style={{ position: 'relative', width: '100%', height: '40px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                        <MySearch width={210} left={5} size='small' placeholder='搜索想加入的群聊' active={true} />
                    </div>
                    <div className='modal-user-list'>
                        {
                            groupChatList.map(v => (
                                <div className='user-item' onClick={() => { onClickUserItem(v) }} key={v.id}>
                                    <Avatar size={40} src={v?.headImg} style={{ backgroundColor: headColors[v.name.length % 10] }} >{v.name}</Avatar>
                                    <div className='user-name'>{v.name}</div>
                                    <MyRadio color='#52c41a' checked={isSelected(v)} />
                                </div>
                            ))
                        }
                        {
                            Object.keys(addressList).map((k, _) => (
                                <div style={{ position: 'relative', width: '100%', display: 'inline-block' }} key={k}>
                                    <div style={{ width: '100%', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#8c8c8c' }}>{k}</div>
                                    {
                                        addressList[k].map((v, i) => (
                                            <div className='user-item' onClick={() => { onClickUserItem(v) }} key={v.id}>
                                                <Avatar size={40} src={v.headImg} style={{ backgroundColor: headColors[v.name.length % 10] }} >{v.name}</Avatar>
                                                <div className='user-name'>{v.name}</div>
                                                <MyRadio color='#52c41a' checked={isSelected(v)} />
                                            </div>
                                        ))
                                    }
                                </div>
                            ))
                        }
                    </div>
                </div>
                <div style={{ width: '50%', height: '100%' }}>
                    <div className='tips-word' style={{ backgroundColor: '#f5f5f5' }}>请选择转发的聊天!</div>
                    <div className='selected-user-list'>
                        {
                            selectedList.map((v, i) => (
                                <div className='user-item' key={v.id}>
                                    <Avatar size={40} src={v?.headImg} style={{ backgroundColor: headColors[v.name.length % 10] }} >{v.name}</Avatar>
                                    <div className='user-name'>{v.name}</div>
                                    <img width={16} src={require('../../static/svg/关闭2.svg').default} onClick={() => { onRemoveSelectUserItem(v) }} />
                                </div>
                            ))
                        }
                    </div>
                    <div style={{ display: 'inline-block', position: 'absolute', bottom: '10px', right: '20px' }}>
                        <Space direction='horizontal' size={10}>
                            <MyButton onClick={onClickCancel}>取消</MyButton>
                            <MyButton onClick={onClickCreate} buttonColor='#40a9ff'>发送</MyButton>
                        </Space>
                    </div>
                </div>
            </div>
        </div>
    )
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))