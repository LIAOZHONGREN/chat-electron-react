import { IdentitySearchService } from '../../service/identitySearchService'
import { IdentitySearchUrl } from '../../router/url'
import { ResponseData } from '../../type'
import Koa from 'koa'
import Router from 'koa-router'
import koaBody from 'koa-body'
import request from 'supertest'
import logger from '../../common/logger'
import { ConnectToDatabase } from '../../common/connectToDatabase'

//测试需要使用数据库 开始测试前连接数据库
beforeAll(async () => {
    await ConnectToDatabase()
})

describe('identitySearchService', () => {

    const koa = new Koa
    const router = new Router
    koa.use(koaBody({ jsonLimit: 1024 * 1024 * 5, formLimit: 1024 * 1024 * 5, textLimit: 1024 * 1024 * 5, multipart: true, formidable: { maxFileSize: 200 * 1024 * 1024 } }));
    router.post(IdentitySearchUrl, IdentitySearchService)
    koa.use(router.routes())

    test('账号搜索测试', () => {
        return request(koa.listen()).post(IdentitySearchUrl).send({ data: '000@qq.com' }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toBeUndefined()
        })
    })
})

//yarn test D:/viewStudy/chat-electron-react/server/src/tests/service/IdentitySearchService.test.ts