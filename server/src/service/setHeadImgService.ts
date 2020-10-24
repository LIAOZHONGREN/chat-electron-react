import { Context } from 'koa'
import { User, IUser } from '../entity/user'
import { getConnection } from 'typeorm'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function SetHeadImgService(ctx: Context) {

    const form = ctx.request.body as { data: string }
    const user = JSON.parse(form.data) as IUser
    try {
        const updataResult = await getConnection().createQueryBuilder().update(User).set({ headImg: user.headImg }).where('id=:id', { id: user.id }).execute()
        if (updataResult.generatedMaps.length) {
            ctx.body = { err: '更新头像失败!' }
            return
        }
        ctx.body = {}
    } catch (err) {
        logger.error('SetHeadImgService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }

}