import axios, { AxiosResponse } from 'axios'
import {
    RegisterUrl,
    LoginUrl,
    SetHeadImgUrl,
    GetVerificationCodeUrl,
    VerificationCodeUrl,
    IdentitySearchUrl,
    GetChatFriendsUrl,
    GetGroupChatsUrl,
    CreateGroupChatUrl,
    GroupChatAddMemberUrl,
    SetGroupChatNameUrl,
    ExitGroupChatUrl,
    AddFriendUrl,
    DeleteFriendUrl, SearchGroupChatUrl, JoinGroupChatUrl, UploadfileUrl
} from '../net/url'
import { User, MyFriends, NewFriend, GroupChat, Chat } from '../net/model'
import { message } from 'antd'
import { existsSync, writeFileSync } from 'fs'
import { Buffer } from 'buffer'
import URL from 'url'
import { CreateFolder } from '../common/tools'
import { StateType } from '../redux/reducer'
import { MyFriendsToAddressList } from '../common/myFriendsToAddressList'
const BMF = require('browser-md5-file');
const bmf = new BMF();

export interface ResponseData {
    err?: string,
    data?: any
}
export type ResponseCallback = (res: ResponseData | undefined, err?: any) => void

function statusError(status: number) {
    status === 404 ? message.error('服务器消失了!') : (status === 500 ? message.error('服务器生病了!') : message.error('我也不知道怎么了!服务器不理我.'))
}

export function UploadFileService(file: File, progressListener?: (progress: number) => void, cb?: ResponseCallback) {
    bmf.md5(file, (err: Error, md5: string) => {
        let form = new FormData()
        form.append('name', `${md5}.${file.name.split('.').pop()}`)
        form.append('file', file)
        axios({
            method: 'POST',
            headers: { 'Content-Type': 'multipart/form-data' },
            url: UploadfileUrl,
            data: form,
            onUploadProgress: e => {
                progressListener(e.loaded / e.total * 100)
            }

        }).then(res => {
            if (res.status === 200) {
                cb ? cb(res.data as ResponseData) : null
                return
            }
            statusError(res.status)
        }).catch(err => {
            cb ? cb(undefined, err) : null
        })
    })
}

export function DownloadFileService(url: string, fileName: string, progressListener?: (progress: number) => void, cb?: (path: string, err?: Error) => void) {
    let path = 'D:/chat/file'
    if (!existsSync(path)) CreateFolder(path)
    //判断文件是否存在,如果存在另取文件名
    if (existsSync(`${path}/${fileName}`)) {
        const [name, format] = ((arr = fileName.split('.')) => [arr.reduce((pv, cv, i, a) => a.length - 1 === i ? pv : `${pv}.${cv}`), arr.pop()])()
        path = `${path}/${name}(1).${format}`
    } else {
        path = `${path}/${fileName}`
    }
    if (!progressListener) progressListener = () => { }
    if (!cb) cb = () => { }
    axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        onDownloadProgress: e => { progressListener(e.loaded / e.total * 100) },
    }).then(res => {
        try {
            writeFileSync(path, new Uint8Array(res.data))
            cb(path)
        } catch (err) {
            cb('', err)
        }
    })
}

export function RegisterService(user: User, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify(user))
    return axios({
        method: 'post',
        url: RegisterUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)
    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function LoginService(user: User, cb?: ResponseCallback) {
    axios({
        method: 'post',
        url: LoginUrl,
        data: user
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function SetHeadImgService(user: User, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify(user))
    axios({
        method: 'post',
        url: SetHeadImgUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function GetVerificationCodeService(user: User, cb?: ResponseCallback) {
    axios({
        method: 'post',
        url: GetVerificationCodeUrl,
        data: user,
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function VerificationCodeService(user: User, code: string, cb?: ResponseCallback) {
    axios({
        method: 'post',
        url: VerificationCodeUrl,
        data: { user: user, code: code },
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function IdentitySearchService(searchValue: string, cb?: ResponseCallback) {
    axios({
        method: 'post',
        url: IdentitySearchUrl,
        data: { value: searchValue }
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function AddFriendService(me: User, friend: User, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify({ me: me, friend: friend }))
    axios({
        method: 'post',
        url: AddFriendUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function DeleteFriendService(me: User, friend: User, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify({ me: me, friend: friend }))
    axios({
        method: 'post',
        url: DeleteFriendUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function GetChatFriendsService(user: User, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify(user))
    axios({
        method: 'post',
        url: GetChatFriendsUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function GetGroupChatsService(user: User, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify(user))
    axios({
        method: 'post',
        url: GetGroupChatsUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function GetChatDataService(user: User, cb?: ResponseCallback) {

    const p0 = new Promise((resolve, reject) => { GetChatFriendsService({ id: user.id } as User, (res, err) => { err ? reject(err) : resolve(res) }) })
    const p1 = new Promise((resolve, reject) => { GetGroupChatsService({ id: user.id } as User, (res, err) => { err ? reject(err) : resolve(res) }) })
    Promise.all([p0, p1]).then((results: ResponseData[]) => {
        let err = results[0].err ? results[0].err : undefined
        err = results[1].err ? err + results[1].err : undefined
        let state: StateType = {}
        results[0].data ? state.addressList = MyFriendsToAddressList(results[0].data) : null
        results[1].data ? state.groupChatList = results[1].data : null
        let rd: ResponseData = { data: state }
        err ? rd.err = err : null
        cb(rd)
    }).catch(err => {
        cb(undefined, err)
    })
}

export function CreateGroupChatService(groupChat: { name: string, creator: User, users: User[] }, cb?: ResponseCallback) {

    let form = new FormData()
    form.append('data', JSON.stringify(groupChat))
    axios({
        method: 'post',
        url: CreateGroupChatUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })

}

export function GroupChatAddMemberService(value: { newMember: User[], groupChat: GroupChat }, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify(value))
    axios({
        method: 'post',
        url: GroupChatAddMemberUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function SetGroupChatNameService(groupChat: GroupChat, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify(groupChat))
    axios({
        method: 'post',
        url: SetGroupChatNameUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function ExitGroupChatService(groupChat: GroupChat, user: User, cb?: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify({ groupChat: groupChat, user: user }))
    axios({
        method: 'post',
        url: ExitGroupChatUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function SearchGroupChatService(name: string, cb: ResponseCallback) {
    let form = new FormData()
    form.append('data', name)
    axios({
        method: 'post',
        url: SearchGroupChatUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}

export function JoinGroupChatService(gu: { groupChat: GroupChat, user: User }, cb: ResponseCallback) {
    let form = new FormData()
    form.append('data', JSON.stringify(gu))
    axios({
        method: 'post',
        url: JoinGroupChatUrl,
        data: form
    }).then(res => {
        if (res.status === 200) {
            cb ? cb(res.data as ResponseData) : null
            return
        }
        statusError(res.status)

    }).catch(err => {
        cb ? cb(undefined, err) : null
    })
}