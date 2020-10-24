import { Context } from 'koa'
import { ResponseData } from '../type'
import { getConnection } from "typeorm";
import logger from '../common/logger'
import { User, IUser } from '../entity/user';
import { ConnectToDatabase } from '../common/connectToDatabase'
import { GetAsync, DelAsync } from '../common/redis'

export async function LoginService(ctx: Context) {

    const iuser: IUser = ctx.request.body
    const query = getConnection().createQueryBuilder()
    const [where, value] = iuser.identity ? ['user.identity=:identity', { identity: iuser.identity }] : ['user.name=:name', { name: iuser.name }]
    const user = await query.select('user').addSelect('user.password').from(User, 'user').where(where, value).getOne()

    if (iuser.password.slice(0, 3) === '验证码') {
        const code = iuser.password.slice(3)
        try {
            const res: { code: string } = JSON.parse(await GetAsync(user.identity))
            DelAsync(user.identity)
            if (!res) { ctx.body = { err: '无法验证!(验证码过期或验证码与账号不匹配)' } }
            else if (res.code == code) { ctx.body = { data: user } }
            else { ctx.body = { err: '验证码错误!' } }
        } catch (err) {
            logger.error('从redis获取验证码信息发生错误:', err)
            ctx.status = 500
            ctx.body = {}
        }
        return
    }

    ctx.body = (!user ? { err: '不存在用户!' } : (user.password == iuser.password ? { data: user } : { err: '密码错误!' })) as ResponseData

}

export async function RegisterService(ctx: Context) {
    const form = ctx.request.body as { data: string }
    const iuser = JSON.parse(form.data) as IUser
    const query = getConnection().createQueryBuilder()
    let user = await query.select('user').from(User, 'user').where('user.identity=:identity', { identity: iuser.identity }).getOne()
    let user2 = await query.select('user2').from(User, 'user2').where('user2.name=:name', { name: iuser.name }).getOne()
    let err = user ? '邮箱已经被注册!' : undefined
    user2 ? err = ((err ? err : '') + '用户名已经存在!') : undefined
    if (err) {
        ctx.body = { err: err } as ResponseData
    } else {
        await query.insert().into(User).values([{ ...iuser }]).execute()
        user = await query.select('user3').from(User, 'user3').where('user3.identity=:identity', { identity: iuser.identity }).getOne()
        user.id ? (ctx.body = { data: user } as ResponseData) : ctx.status = 500
    }
}