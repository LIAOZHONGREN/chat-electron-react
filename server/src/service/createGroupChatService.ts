import { Context } from 'koa'
import { IUser } from '../entity/user'
import { GroupChat, GroupChatMember, IGroupChat } from '../entity/groupChat'
import { getRepository } from 'typeorm'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function CreateGroupChatService(ctx: Context) {

    const form = ctx.request.body as { data: string }
    const groupchat = JSON.parse(form.data) as { name: string, creator: IUser, users: IUser[] }
    try {
        const insertResult = await getRepository(GroupChat).insert({ name: groupchat.name, creatorId: groupchat.creator.id })
        const gcId = insertResult.identifiers[0].id
        const groupChatMembers: GroupChatMember[] = groupchat.users.map((u) => ({ groupChatId: gcId, userId: u.id }))
        await getRepository(GroupChatMember).insert(groupChatMembers)
        let users: { [id: string]: IUser } = {}
        for (const u of groupchat.users) {
            users[u.id] = u
        }
        let rd: ResponseData = { data: { id: gcId, name: groupchat.name, creator: groupchat.creator, users: users } as IGroupChat }
        ctx.body = rd
    } catch (err) {
        logger.error('CreateGroupChatService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }

}