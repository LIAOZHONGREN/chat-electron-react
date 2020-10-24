import { Context } from 'koa'
import { IUser } from '../entity/user'
import { MyFriend } from '../entity/myFriend'
import { getConnection } from 'typeorm'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function AddFriendService(ctx: Context) {

    const form = ctx.request.body as { data: string }
    const mf = JSON.parse(form.data) as { me: IUser, friend: IUser }
    try {
        const [m, f] = [{ myId: mf.me.id, friendId: mf.friend.id } as MyFriend, { myId: mf.friend.id, friendId: mf.me.id } as MyFriend]
        const insertResult = await getConnection().createQueryBuilder().insert().into(MyFriend).values([m, f]).execute()
        ctx.body = insertResult.identifiers.length === 2 ? {} : { err: '添加聊友发生错误!' }
    } catch (err) {
        logger.error('AddFriendService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }

}

export async function DeleteFriendService(ctx: Context) {

    const form = ctx.request.body as { data: string }
    const mf = JSON.parse(form.data) as { me: IUser, friend: IUser }
    try {
        await getConnection().createQueryBuilder().delete().from(MyFriend).where(`myId in ("${mf.me.id}","${mf.friend.id}")`).execute()
        ctx.body = {}
    } catch (err) {
        logger.error('DeleteFriendService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }
}