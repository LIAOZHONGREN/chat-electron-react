import { Context } from 'koa'
import { IUser } from '../entity/user'
import { GroupChatMember, IGroupChat } from '../entity/groupChat'
import { getRepository } from 'typeorm'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function GroupChatAddMemberService(ctx: Context) {

    const form = ctx.request.body as { data: string }
    const gAndM = JSON.parse(form.data) as { newMember: IUser[], groupChat: IGroupChat }
    try {
        const groupChatMembers: GroupChatMember[] = gAndM.newMember.map((u) => ({ groupChatId: gAndM.groupChat.id, userId: u.id }))
        const insertResult = await getRepository(GroupChatMember).insert(groupChatMembers)
        if (insertResult.identifiers.length === gAndM.newMember.length) {
            ctx.body = {}
        } else {
            ctx.status = 500
            ctx.body = { err: '服务器生病了!' }
        }
    } catch (err) {
        logger.error('GroupChatAddMemberService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }

}