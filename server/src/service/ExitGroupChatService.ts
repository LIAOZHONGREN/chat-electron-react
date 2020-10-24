import { Context } from 'koa'
import { IUser } from '../entity/user'
import { GroupChatMember, IGroupChat } from '../entity/groupChat'
import { getConnection } from 'typeorm'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function ExitGroupChatService(ctx: Context) {

    const form = ctx.request.body as { data: string }
    const data = JSON.parse(form.data) as { groupChat: IGroupChat, user: IUser }
    try {
        await getConnection().createQueryBuilder().delete().from(GroupChatMember).where('groupChatId=:gcId and userId=:uId', { gcId: data.groupChat.id, uId: data.user.id }).execute()
        ctx.body = {}
    } catch (err) {
        logger.error('ExitGroupChatService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }

}