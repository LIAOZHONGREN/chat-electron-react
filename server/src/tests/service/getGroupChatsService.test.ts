import { GetGroupChatsService } from '../../service/getGroupChatsService'
import { GetGroupChatsUrl } from '../../router/url'
import { User, IUser, GenderEnum } from '../../entity/user'
import { GroupChat, GroupChatMember } from '../../entity/groupChat'
import { ResponseData } from '../../type'
import Koa from 'koa'
import Router from 'koa-router'
import koaBody from 'koa-body'
import request from 'supertest'
import { ConnectToDatabase } from '../../common/connectToDatabase'
import { getConnection } from 'typeorm'

//测试需要使用数据库 开始测试前连接数据库
let myId = ''
beforeAll(async () => {
    await ConnectToDatabase()
    const query = await getConnection().createQueryBuilder()
    //向数据库插入4条假user数据
    const result = await query.insert().into(User).values([
        { identity: '000@qq.com', name: '000', password: '000', gender: GenderEnum.unisex, },
        { identity: '111@qq.com', name: '111', password: '111', gender: GenderEnum.unisex, },
        { identity: '222@qq.com', name: '222', password: '222', gender: GenderEnum.unisex, },
        { identity: '333@qq.com', name: '333', password: '333', gender: GenderEnum.unisex, },
    ]).execute()

    myId = result.identifiers[0].id

    //向数据库插入假GroupChat数据
    const result2 = await query.insert().into(GroupChat).values([{ name: '三人组', creatorId: myId }]).execute()
    await query.insert().into(GroupChatMember).values([
        { groupChatId: result2.identifiers[0].id, userId: result.identifiers[0].id },
        { groupChatId: result2.identifiers[0].id, userId: result.identifiers[1].id },
        { groupChatId: result2.identifiers[0].id, userId: result.identifiers[2].id },
        { groupChatId: result2.identifiers[0].id, userId: result.identifiers[3].id },
    ]).execute()
    const result3 = await query.insert().into(GroupChat).values([{ name: '三傻', creatorId: myId }]).execute()
    await query.insert().into(GroupChatMember).values([
        { groupChatId: result3.identifiers[0].id, userId: result.identifiers[0].id },
        { groupChatId: result3.identifiers[0].id, userId: result.identifiers[1].id },
        { groupChatId: result3.identifiers[0].id, userId: result.identifiers[2].id },
        { groupChatId: result3.identifiers[0].id, userId: result.identifiers[3].id },
    ]).execute()
})

afterAll(async () => {
    await getConnection().dropDatabase()//删除数据库及其所有数据
    getConnection().close()
});

describe('getChatFriendsService', () => {

    const koa = new Koa
    const router = new Router
    koa.use(koaBody({ jsonLimit: 1024 * 1024 * 5, formLimit: 1024 * 1024 * 5, textLimit: 1024 * 1024 * 5, multipart: true, formidable: { maxFileSize: 200 * 1024 * 1024 } }));
    router.post(GetGroupChatsUrl, GetGroupChatsService)
    koa.use(router.routes())

    test('获取加入的群聊数据测试', () => {
        return request(koa.listen()).post(GetGroupChatsUrl).send({ data: JSON.stringify({ id: myId } as IUser) }).expect(200).then(res => {
            console.log(res.body.data)
            expect((res.body as ResponseData).err).toBeUndefined()
        })
    })

})

//yarn test D:/viewStudy/chat-electron-react/server/src/tests/service/getGroupChatsService.test.ts