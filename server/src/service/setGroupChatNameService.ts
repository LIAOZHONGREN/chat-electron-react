import { Context } from 'koa'
import { GroupChat, IGroupChat } from '../entity/groupChat'
import { getConnection } from 'typeorm'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function SetGroupChatNameService(ctx: Context) {

    const form = ctx.request.body as { data: string }
    const gc = JSON.parse(form.data) as IGroupChat
    try {
        await getConnection().createQueryBuilder().update(GroupChat).set({ name: gc.name }).where('id=:id', { id: gc.id }).execute()
        ctx.body = {}
    } catch (err) {
        logger.error('SetGroupChatNameService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }

}