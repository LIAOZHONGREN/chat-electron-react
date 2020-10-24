import { Context } from 'koa'
import { User, IUser } from '../entity/user'
import { MyFriend, IMyFriends } from '../entity/myFriend'
import { getRepository } from 'typeorm'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function GetChatFriendsService(ctx: Context) {

    const form = ctx.request.body as { data: string }
    const user = JSON.parse(form.data) as IUser
    try {
        const myFriends = await getRepository(User).createQueryBuilder('u').innerJoinAndSelect(MyFriend, 'm', 'm.friendId = u.id').where('m.myId=:id', { id: user.id }).getMany()
        let rd: ResponseData = {}
        myFriends.length > 0 ? rd.data = { users: myFriends as IUser[] } as IMyFriends : null
        ctx.body = rd
    } catch (err) {
        logger.error('GetChatFriendsService:', err)
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }
}