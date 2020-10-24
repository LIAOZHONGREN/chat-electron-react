import { Context } from 'koa'
import { getRepository } from 'typeorm'
import { GroupChat, IGroupChat, GroupChatMember } from '../entity/groupChat'
import logger from '../common/logger'
import { User, IUser } from '../entity/user'
import { ResponseData } from '../type'

export async function GetGroupChatsService(ctx: Context) {
    const form = ctx.request.body as { data: string }
    const user = JSON.parse(form.data) as IUser
    try {
        const sql = getRepository(GroupChatMember).createQueryBuilder('gcm').select('gcm.groupChatId', 'id').where('gcm.userId=:id').getQuery()
        const groupChats = await getRepository(GroupChat).createQueryBuilder('gc').select('*').where(`gc.id in (${sql})`, { id: user.id }).execute();
        let [gcs, ps] = [new Array<IGroupChat>(), new Array<Promise<any>>()]
        for (const v of (groupChats as GroupChat[])) {
            let gc: IGroupChat = { id: v.id, name: v.name }
            gcs.push(gc)
            ps.push(new Promise(async (resolve, reject) => {
                try {
                    gc.creator = (await getRepository(User).createQueryBuilder('u').select(['id', 'identity', 'name', 'gender', 'area', 'headImg']).where('u.id=:id', { id: v.creatorId }).execute())[0] as IUser
                    const users = (await getRepository(User).createQueryBuilder('u').select(['id', 'identity', 'name', 'gender', 'area', 'headImg']).leftJoin(GroupChatMember, 'gcm', `gcm.groupChatId = :id`, { id: v.id }).where('u.id = gcm.userId').execute()) as IUser[]
                    gc.users = {}
                    for (const u of users) {
                        gc.users[u.id] = u
                    }
                    resolve()
                } catch (error) {
                    logger.error('GetGroupChatsService:', error)
                    reject()
                }
            }))
        }
        await Promise.all(ps).then(() => {
            let rd: ResponseData = {}
            gcs.length > 0 ? rd.data = gcs : null
            ctx.body = rd
        }).catch(() => {
            ctx.status = 500
            ctx.body = { err: '服务器生病了!' } as ResponseData
        })
    } catch (err) {
        logger.error('GetGroupChatsService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }
}