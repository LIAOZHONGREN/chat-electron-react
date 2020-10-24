
import { ResponseData } from '../net/net'
import { message } from 'antd'

export function ResponseErrorHandle(res: ResponseData | undefined, err: any, errMsg: string, successAction: (result: any) => void) {
    if (err) {
        message.error(errMsg)
        return
    }
    res.err ? message.error(res.err) : successAction(res.data)
}