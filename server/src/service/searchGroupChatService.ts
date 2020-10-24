import { Context } from 'koa'
import { getConnection, getRepository } from 'typeorm'
import { GroupChat, IGroupChat } from '../entity/groupChat'
import { User } from '../entity/user'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function SearchGroupChatService(ctx: Context) {
    const name = (ctx.request.body as { data: string }).data
    let rd: ResponseData = {}
    try {
        const groupChats = await getRepository(GroupChat).createQueryBuilder().select().where('name=:name', { name: name }).getOne()
        if (groupChats) {
            const creator = await getRepository(User).createQueryBuilder().select().where('id=:id', { id: groupChats.creatorId }).getOne()
            creator ? rd.data = { ...groupChats, creator: creator } as IGroupChat : null
        }
        ctx.body = rd
    } catch (error) {
        logger.error('SearchGroupChatService:', error)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }
}