import { Context } from 'koa'
import { User, IUser } from '../entity/user'
import { SendVerificationCode } from '../common/sendVerificationCode'
import { ResponseData } from '../type'
import { getConnection } from "typeorm";
import { GetAsync, DelAsync } from '../common/redis'
import logger from '../common/logger';

export async function SendVerificationCodeToMailerService(ctx: Context) {

    let iuser: IUser = ctx.request.body
    if (!iuser.identity) {
        const query = getConnection().createQueryBuilder()
        const user: User = await query.select(['user.identity']).from(User, 'user').where('user.name=:name', { name: iuser.name }).getOne()
        if (!user.identity) {
            ctx.body = { err: '不存在用户!' } as ResponseData
            return
        }
        iuser.identity = user.identity
    }
    await SendVerificationCode(iuser.identity).then(() => {
        ctx.body = {}
    }).catch(err => {
        ctx.body = { err: '发送验证码失败!' } as ResponseData
    })

}

export async function VerificationCodeIsPassService(ctx: Context) {
    const { user, code } = ctx.request.body as { user: IUser, code: string }
    if (!user.identity) {
        const query = getConnection().createQueryBuilder()
        const user_: User = await query.select(['user.identity']).from(User, 'user').where('user.name=:name', { name: user.name }).getOne()
        user.identity = user_.identity
    }

    try {
        const res: { code: string } = JSON.parse(await GetAsync(user.identity))
        DelAsync(user.identity)
        if (!res) { ctx.body = { err: '无法验证!(验证码过期或验证码与账号不匹配)' } }
        else if (res.code == code) { ctx.body = {} }
        else { ctx.body = { err: '验证码错误!' } }
    } catch (err) {
        logger.error('从redis获取验证码信息发生错误:', err)
        ctx.status = 500
        ctx.body = {}
    }
}
