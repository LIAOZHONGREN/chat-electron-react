import { CreateGroupChatService } from '../../service/createGroupChatService'
import { CreateGroupChatUrl } from '../../router/url'
import { User, IUser, GenderEnum } from '../../entity/user'
import { ResponseData } from '../../type'
import Koa from 'koa'
import Router from 'koa-router'
import koaBody from 'koa-body'
import request from 'supertest'
import logger from '../../common/logger'
import { ConnectToDatabase } from '../../common/connectToDatabase'
import { getConnection, getRepository } from 'typeorm'

//测试需要使用数据库 开始测试前连接数据库
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
})

afterAll(async () => {
    await getConnection().dropDatabase()//删除数据库及其所有数据
    getConnection().close()
});

describe('getChatFriendsService', () => {

    const koa = new Koa
    const router = new Router
    koa.use(koaBody({ jsonLimit: 1024 * 1024 * 5, formLimit: 1024 * 1024 * 5, textLimit: 1024 * 1024 * 5, multipart: true, formidable: { maxFileSize: 200 * 1024 * 1024 } }));
    router.post(CreateGroupChatUrl, CreateGroupChatService)
    koa.use(router.routes())

    test('创建群聊测试', async () => {

        const users: IUser[] = await getRepository(User).createQueryBuilder().select(['id', 'identity', 'name', 'gender', 'area', 'headImg']).limit(4).execute()

        const groupChatName = users.slice(0, 4).reduce((pv, cv, i, a) => (pv += cv.name), '') + '...'
        const groupChat: { name: string, creator: IUser, users: IUser[] } = { name: groupChatName, creator: users[0], users: users }

        return request(koa.listen()).post(CreateGroupChatUrl).send({ data: JSON.stringify(groupChat) }).expect(200).then(res => {
            console.log(res.body.data)
            expect((res.body as ResponseData).err).toBeUndefined()
        })
    })

})

//yarn test D:/viewStudy/chat-electron-react/server/src/tests/service/createGroupChatService.test.ts