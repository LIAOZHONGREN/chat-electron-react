import React, { useState, useMemo, useEffect } from 'react'
import ReactDom from 'react-dom'
import { MyButton, MySearch, MyInput } from '../../components/components'
import { Space, message, Avatar } from 'antd'
import { User, GenderEnum, NewFriend, FriendState, WindowCommunicationType, WindowCommunicationData } from '../../net/model'
import { IdentitySearchService } from '../../net/net'
import { DeepCopy, TrimAll } from '../../common/tools'
import { ResponseErrorHandle } from '../../common/ResponseErrorHandle'
import { IsMyFriend } from '../../common/isMyFriend'
import '../../static/scss/main.scss'
import './identitySearchModal.scss'
import { useModal } from '../useModal'
import { remote, ipcRenderer } from 'electron'

export interface IModalProps {
}

//头像背景色
const headColors = ['#ff7875', '#bae637', '#ffec3d', '#36cfc9', '#40a9ff', '#597ef7', '#9254de', '#eb2f96', '#ffe58f', '#eaff8f']
let me: User = null


export default function Modal(props: IModalProps) {

    const [searchIdentityResult, setsearchIdentityResult] = useState<User[]>([])
    const [authentication, setauthentication] = useState<string>('')//申请好友的身份认证的话
    const [action, setaction] = useState<'add-friend' | ''>('')
    const [addressList, setaddressList] = useState<{ [initials: string]: User[] }>({})
    const { closeModal } = useModal({
        onInitData: data => {
            setaddressList(data.data.addressList)
            me = data.data.me
        }
    })

    //搜索账号加好友
    function searchIdentity(value: string) {
        onClickCancel()
        const val = TrimAll(value)
        if (val.length === 0) {
            message.warning('搜索内容不可为空!')
            return
        }
        IdentitySearchService(val, (res, err) => {
            ResponseErrorHandle(res, err, '搜索发生错误了', data => {
                setsearchIdentityResult(data)
            })
        })

    }

    function onClickCancel() {
        setaction('')
        setsearchIdentityResult([])
        setauthentication('')
    }

    //提交申请加为聊友的身份验证信息
    function onClickSubmit() {
        closeModal({ user: DeepCopy(searchIdentityResult[0]), authentication: authentication })
    }

    useMemo(() => {
        const win = remote.getCurrentWindow()
        const bounds = win.getBounds()
        if (searchIdentityResult.length > 0) {
            bounds.height = 150
            win.setBounds(bounds, true)
        } else {
            bounds.height = 60
        }
        if (action === 'add-friend') {
            bounds.height = 250
        }
        win.setBounds(bounds, true)
    }, [searchIdentityResult, action])

    return (
        <div className='identity-search'>

            <div className='close-window' onClick={() => { closeModal() }}><i className='fa fa-close' /></div>
            <div style={{ width: '100%', height: '15px' }}></div>
            <div className='identity-search-input'>
                <MySearch size='small' active={true} direction='left' left={5} width={440} onSearch={searchIdentity} placeholder='输入你想找的朋友账号' />
            </div>
            <div className='identity-search-modal-result'>
                {
                    searchIdentityResult.map((item, index) => (
                        <div style={{ position: 'relative', width: '100%', paddingBottom: '30px', display: 'flex', flexDirection: 'column' }} key={index}>
                            <div style={{ position: 'relative', width: '100%', height: '60px', display: 'flex', flexDirection: 'row' }}>
                                <div style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Avatar size={50} src={item.headImg} style={{ backgroundColor: headColors[item.name.length % 10] }}>{item.name}</Avatar>
                                </div>
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ height: '25px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                        <div className='username'>{item.name}</div>
                                        {
                                            item.gender != GenderEnum.unisex ? (
                                                item.gender == GenderEnum.girl ? <img width={25} src={require('../../static/svg/girl.svg').default} alt="" />
                                                    : <img width={25} src={require('../../static/svg/boy.svg').default} alt="" />
                                            ) : null
                                        }
                                    </div>
                                    <div style={{ height: '15px', lineHeight: '15px', fontSize: '13px', color: '#8c8c8c' }}>
                                        账号: {item.identity}&emsp;地区:{item.area}
                                    </div>
                                </div>
                            </div>
                            <div style={{ position: 'absolute', right: '5px', bottom: '5px' }}>
                                {
                                    item.id !== me?.id ? (
                                        IsMyFriend(item, addressList) ? <MyButton buttonColor='#91d5ff' onClick={onClickSubmit} >发消息</MyButton> : (
                                            action === '' ? (
                                                <MyButton buttonColor='#91d5ff' onClick={() => { setaction('add-friend') }}>添加聊友</MyButton>
                                            ) : null
                                        )
                                    ) : null
                                }
                            </div>
                        </div>
                    ))
                }
            </div>
            {
                action === 'add-friend' ? (
                    <div className='verify-info-input'>
                        <MyInput focus={true} width={504} height={60} wordLimit={100} placeholder='告诉对方你是谁,提高通过率.' value={authentication} onChange={(v) => { setauthentication(v) }} />
                    </div>
                ) : null
            }
            {
                action === 'add-friend' ? (
                    <div className='cancel-submit'>
                        <Space direction='horizontal' align='center' size={5}>
                            <MyButton buttonColor='#ff4d4f' onClick={onClickCancel}>取消</MyButton>
                            <MyButton buttonColor='#40a9ff' onClick={onClickSubmit}>提交</MyButton>
                        </Space>
                    </div>
                ) : null
            }
        </div>
    );
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))