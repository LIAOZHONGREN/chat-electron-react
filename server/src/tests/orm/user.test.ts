
import { User, GenderEnum, IUser } from '../../entity/user'
import { ConnectToDatabase } from '../../common/connectToDatabase'
import { getConnection, getManager, getRepository } from 'typeorm'
import { MyFriend } from '../../entity/myFriend'
import { GroupChat, GroupChatMember, IGroupChat } from '../../entity/groupChat'

beforeAll(async () => {
    await ConnectToDatabase()
})

afterAll(async () => {
    await getConnection().dropDatabase()//删除数据库及其所有数据
    getConnection().close()
});

describe('user表测试', () => {

    // test('insert', () => {
    //     return getConnection().createQueryBuilder().insert().into(User).values([
    //         { identity: '000@qq.com', name: '000', password: '000', gender: GenderEnum.unisex, },
    //         { identity: '111@qq.com', name: '111', password: '111', gender: GenderEnum.unisex, },
    //         { identity: '222@qq.com', name: '222', password: '222', gender: GenderEnum.unisex, },
    //     ]).execute()
    // })

    // test('sql_select', async () => {
    //     const users = await getManager().query(`
    //        select * from user u where u.identity = "${'000@qq.com'}" limit 1
    //     `)
    //     const us = (users as User[])
    //     console.log(us)
    // })

    // test('sql_select2', async () => {
    //     const users = await getManager().query(`select u.identity,u.name,u.gender,u.area,u.headImg from user u`)
    //     const us = (users as User[])
    //     console.log(us)
    // })

    // test('sql_select3', async () => {
    //     const users = await getConnection().createQueryBuilder().select('u.identity,u.name,u.gender,u.area,u.headImg').from(User, 'u').where('u.identity=:identity', { identity: '000@qq.com' }).execute()
    //     const us = (users as User[])
    //     console.log(us)
    // })

    test('sql', async () => {

        const query = await getConnection().createQueryBuilder()
        await query.insert().into(User).values([
            { identity: '000@qq.com', name: '000', password: '000', gender: GenderEnum.unisex, },
            { identity: '111@qq.com', name: '111', password: '111', gender: GenderEnum.unisex, },
            { identity: '222@qq.com', name: '222', password: '222', gender: GenderEnum.unisex, },
            { identity: '333@qq.com', name: '333', password: '333', gender: GenderEnum.unisex, },
        ]).execute()

        const users = await query.select().from(User, 'user').limit(4).execute()
        const us = (users as User[])
        let values: { myId: string, friendId: string }[] = []
        for (let i = 0; i < us.length; i++) {
            for (let j = 0; j < us.length; j++) {
                if (us[i].id === us[j].id) continue
                values.push({ myId: us[i].id, friendId: us[j].id })
            }
        }
        await query.insert().into(MyFriend).values(values).execute()
        let result = await query.insert().into(GroupChat).values([{ name: '三人组', creatorId: us[0].id }]).execute()
        await query.insert().into(GroupChatMember).values([
            { groupChatId: result.identifiers[0].id, userId: us[0].id },
            { groupChatId: result.identifiers[0].id, userId: us[1].id },
            { groupChatId: result.identifiers[0].id, userId: us[2].id },
            { groupChatId: result.identifiers[0].id, userId: us[3].id },
        ]).execute()

        //const myFriends = await query.select('u2.*').distinct().from(User, 'u2').leftJoinAndSelect(MyFriend, 'myFriend', 'u2.id=myFriend.friendId').where('myFriend.myId =:id', { id: us[0].id }).execute()
        // const myFriends = await query.select().from(User, 'u2').where(qb => {
        //     const subQuery = qb.subQuery().select('myfriend.friendId').from(MyFriend, 'myfriend').where('myfriend.myId=:id', { id: us[0].id }).getQuery()
        //     return 'u2.id in' + subQuery
        // }).execute()
        //const myFriends = await query.select().distinct().from(MyFriend, 'myFriend').leftJoinAndSelect(User, 'u', 'myFriend.friendId = u.id').where('myFriend.myId=:id', { id: us[0].id }).execute()
        //const myFriends = await getRepository(User).createQueryBuilder('u').innerJoinAndSelect(MyFriend, 'm', 'm.friendId = u.id').where('m.myId=:id', { id: us[0].id }).getMany()
        // console.log(myFriends)
        // const member = await query.select(['uu.id', 'uu.identity', 'uu.name', 'uu.gender', 'uu.area', 'uu.headImg']).from(GroupChatMember, 'gcm').leftJoinAndSelect(User, 'uu', 'gcm.userId=uu.id').where('gcm.groupChatId=:id', { id: result.identifiers[0].id }).execute()
        //const mb = (member as IUser[])
        //console.log(mb)
        //const sql = await query.select('gcm.groupChatId', 'id').from(GroupChatMember, 'gcm').where('gcm.userId=:id', { id: us[0].id }).execute()
        const sql = getRepository(GroupChatMember).createQueryBuilder('gcm').select('gcm.groupChatId', 'id').where('gcm.userId=:id').getQuery()
        const groupChats = await getRepository(GroupChat).createQueryBuilder('gc').select('*').where(`gc.id in (${sql})`, { id: us[0].id }).execute();
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
                    reject()
                }
            }))
        }
        await Promise.all(ps).then(() => { console.log(gcs) }).catch(() => { console.log('错误') })

    })


})



//yarn test D:/viewStudy/chat-electron-react/server/src/tests/orm/user.test.ts