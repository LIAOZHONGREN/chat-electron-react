import { GetChatFriendsService } from '../../service/getChatFriendsService'
import { GetChatFriendsUrl } from '../../router/url'
import { User, IUser, GenderEnum } from '../../entity/user'
import { MyFriend } from '../../entity/myFriend'
import { ResponseData } from '../../type'
import Koa from 'koa'
import Router from 'koa-router'
import koaBody from 'koa-body'
import request from 'supertest'
import logger from '../../common/logger'
import { ConnectToDatabase } from '../../common/connectToDatabase'
import { getConnection } from 'typeorm'

//测试需要使用数据库 开始测试前连接数据库
let myId = ''
beforeAll(async () => {
    await ConnectToDatabase()
    const query = await getConnection().createQueryBuilder()
    //向数据库插入4条假user数据
    const insertResult = await query.insert().into(User).values([
        { identity: '000@qq.com', name: '000', password: '000', gender: GenderEnum.unisex, },
        { identity: '111@qq.com', name: '111', password: '111', gender: GenderEnum.unisex, },
        { identity: '222@qq.com', name: '222', password: '222', gender: GenderEnum.unisex, },
        { identity: '333@qq.com', name: '333', password: '333', gender: GenderEnum.unisex, },
    ]).execute()

    //向数据库插入假MyFriend数据
    const userIds = insertResult.identifiers as { id: string }[]
    myId = userIds[0].id
    let values: { myId: string, friendId: string }[] = []
    for (let i = 0; i < userIds.length; i++) {
        for (let j = 0; j < userIds.length; j++) {
            if (userIds[i].id === userIds[j].id) continue
            values.push({ myId: userIds[i].id, friendId: userIds[j].id })
        }
    }
    await query.insert().into(MyFriend).values(values).execute()
})

afterAll(async () => {
    await getConnection().dropDatabase()//删除数据库及其所有数据
    getConnection().close()
});

describe('getChatFriendsService', () => {

    const koa = new Koa
    const router = new Router
    koa.use(koaBody({ jsonLimit: 1024 * 1024 * 5, formLimit: 1024 * 1024 * 5, textLimit: 1024 * 1024 * 5, multipart: true, formidable: { maxFileSize: 200 * 1024 * 1024 } }));
    router.post(GetChatFriendsUrl, GetChatFriendsService)
    koa.use(router.routes())

    test('获取聊友数据测试', () => {
        return request(koa.listen()).post(GetChatFriendsUrl).send({ data: JSON.stringify({ id: myId } as IUser) }).expect(200).then(res => {
            //console.log(res.body.data.users[0])
            expect((res.body as ResponseData).err).toBeUndefined()
        })
    })

})

//yarn test D:/viewStudy/chat-electron-react/server/src/tests/service/getChatFriendsService.test.ts