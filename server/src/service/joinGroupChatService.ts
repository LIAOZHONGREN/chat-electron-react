import { Context } from 'koa'
import { getRepository } from 'typeorm'
import { IUser } from '../entity/user'
import { GroupChatMember, IGroupChat } from '../entity/groupChat'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function JoinGroupChatService(ctx: Context) {
    const value = (ctx.request.body as { data: string }).data
    const gu: { groupChat: IGroupChat, user: IUser } = JSON.parse(value)
    try {

        const insertResult = await getRepository(GroupChatMember).insert([{ groupChatId: gu.groupChat.id, userId: gu.user.id }])
        ctx.body = insertResult.identifiers.length === 1 ? {} : { err: '加入群聊发生错误' }

    } catch (error) {
        logger.error('JoinGroupChatService:', error)
        ctx.status = 500
        ctx.body = {}
    }
}