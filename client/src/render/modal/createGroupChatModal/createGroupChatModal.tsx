import React, { useState } from 'react'
import ReactDom from 'react-dom'
import { MySearch, MyButton, MyRadio, Loading, MyInput } from '../../components/components'
import { Avatar, Radio, Space, message, Tooltip } from 'antd'
import { UserOutlined } from '@ant-design/icons';
import { User, GroupChat, ChatType, WindowCommunicationData, WindowCommunicationType } from '../../net/model'
import { CreateGroupChatService, SearchGroupChatService } from '../../net/net'
import { TrimAll } from '../../common/tools'
import '../../static/scss/main.scss'
import './createGroupChatModal.scss'
import { ResponseErrorHandle } from '../../common/ResponseErrorHandle'
import { useModal } from '../useModal'

//头像背景色
const headColors = ['#ff7875', '#bae637', '#ffec3d', '#36cfc9', '#40a9ff', '#597ef7', '#9254de', '#eb2f96', '#ffe58f', '#eaff8f']
let me: User

function Modal() {

    const [addressList, setaddressList] = useState<{ [initials: string]: User[] }>({})
    const [selectedList, setselectedList] = useState<User[]>([])
    const [loading, setloading] = useState<boolean>(false)
    const [searchGroupChatResult, setsearchGroupChatResult] = useState<GroupChat | null>(null)
    const [isSearch, setisSearch] = useState(false)
    const [searchContent, setsearchContent] = useState<User[]>([])
    const { closeModal } = useModal({
        onInitData: data => {
            me = data.data.me
            setaddressList(data.data.addressList)
        }
    })

    function isSelected(user: User) {
        return selectedList.findIndex((v, _, o) => (v.id === user.id)) > -1
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

    function onClickCreate() {
        if (selectedList.length < 2) {
            message.warning('群聊人数不可少于3人!')
            return
        }
        setloading(true)
        const groupChatName = selectedList.slice(0, 4).reduce((pv, cv, i, a) => (pv += cv.name), '') + '...'
        const groupChat: { name: string, creator: User, users: User[] } = { name: groupChatName, creator: me, users: [me].concat(selectedList) }
        CreateGroupChatService(groupChat, (res, err) => {
            setloading(false)
            if (err) {
                message.error('创建群聊发生错误!')
                return
            }
            res.err ? message.error(res.err) : (() => {
                closeModal(res.data)
            })()
        })

    }

    function onSearch(v: string) {
        let users: User[] = []
        if (v.trim()) {
            Object.values(addressList).forEach(us => {
                us.forEach(u => {
                    if (u.name.indexOf(v) > -1 || u.identity.indexOf(v) > -1) users.push(u)
                })
            })
        }
        setsearchContent(users)
    }

    return (
        <div className='modal-win'>
            <Loading loading={loading} color='#fe5f55' text='创建中' />
            <div className='close-window' onClick={() => { closeModal() }}><i className='fa fa-close' /></div>

            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'row' }}>
                <div className='content left'>
                    <div className='modal-search-input'>
                        <MySearch width={210} left={5} size='small' placeholder='搜索' onSearch={onSearch} onClose={() => setsearchContent([])} />
                    </div>
                    {searchContent.length > 0 ? (
                        <div className='search-content-list'>
                            {
                                searchContent.map((v, i) => (
                                    <div className='user-item' onClick={() => { onClickUserItem(v) }} key={v.id}>
                                        <Avatar size={40} src={v.headImg} style={{ backgroundColor: headColors[v.name.length % 10] }} >{v.name}</Avatar>
                                        <div className='user-name'>{v.name}</div>
                                        <MyRadio color='#52c41a' checked={isSelected(v)} />
                                    </div>
                                ))
                            }
                        </div>
                    ) : null}
                    <div className='modal-user-list'>
                        {
                            Object.keys(addressList).map(k => (
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

                <div className='content right'>
                    <div className='tips-word' style={{ backgroundColor: '#f5f5f5' }}>群聊需要成员!</div>
                    <div className='selected-user-list'>
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
                    <div className='cancel-create'>
                        <Space direction='horizontal' size={10}>
                            <MyButton onClick={onClickCancel}>取消</MyButton>
                            <MyButton onClick={onClickCreate} buttonColor='#40a9ff'>创群</MyButton>
                        </Space>
                    </div>
                </div>
            </div>
        </div>
    )
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))