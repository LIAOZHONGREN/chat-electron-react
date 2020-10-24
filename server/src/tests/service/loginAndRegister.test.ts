import { RegisterService, LoginService } from '../../service/loginAndRegister'
import { RegisterUrl, LoginUrl } from '../../router/url'
import { IUser, GenderEnum } from '../../entity/user'
import { ResponseData } from '../../type'
import Koa from 'koa'
import Router from 'koa-router'
import koaBody from 'koa-body'
import request from 'supertest'
import logger from '../../common/logger'
import { ConnectToDatabase } from '../../common/connectToDatabase'
import { getConnection } from 'typeorm'

//测试需要使用数据库 开始测试前连接数据库
beforeAll(async () => {
    await ConnectToDatabase()
})

afterAll(async () => {
    // await getConnection().dropDatabase()//删除数据库及其所有数据
    getConnection().close()
});

describe('loginAndRegister', () => {

    const koa = new Koa
    const router = new Router
    koa.use(koaBody({ jsonLimit: 1024 * 1024 * 5, formLimit: 1024 * 1024 * 5, textLimit: 1024 * 1024 * 5, multipart: true, formidable: { maxFileSize: 200 * 1024 * 1024 } }));
    router.post(RegisterUrl, RegisterService)
    router.post(LoginUrl, LoginService)
    koa.use(router.routes())

    test('测试注册_成功', () => {
        return request(koa.listen()).post(RegisterUrl).send({ data: JSON.stringify({ identity: '8888@qq.com', name: 'register', password: '12345678', gender: GenderEnum.girl, area: '广东 广州' } as IUser) }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toBeUndefined()
        })
    })

    test('测试注册_失败(邮箱和用户名已经被注册)', () => {
        return request(koa.listen()).post(RegisterUrl).send({ data: JSON.stringify({ identity: '8888@qq.com', name: 'register', password: '12345678', gender: GenderEnum.girl, area: '广东 广州' } as IUser) }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toEqual('邮箱已经被注册!用户名已经存在!')
        })
    })

    test('测试注册_失败(用户名已经被注册)', () => {
        return request(koa.listen()).post(RegisterUrl).send({ data: JSON.stringify({ identity: '888@qq.com', name: 'register', password: '12345678', gender: GenderEnum.girl, area: '广东 广州' } as IUser) }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toEqual('用户名已经存在!')
        })
    })

    test('测试注册_失败(邮箱已经被注册)', () => {
        return request(koa.listen()).post(RegisterUrl).send({ data: JSON.stringify({ identity: '8888@qq.com', name: 'registe', password: '12345678', gender: GenderEnum.girl, area: '广东 广州' } as IUser) }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toEqual('邮箱已经被注册!')
        })
    })

    test('测试登录_成功', () => {
        return request(koa.listen()).post(LoginUrl).send({ data: JSON.stringify({ identity: '8888@qq.com', name: 'register', password: '12345678' } as IUser) }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toBeUndefined()
        })
    })

    test('测试登录_失败(不存在用户)', () => {
        return request(koa.listen()).post(LoginUrl).send({ data: JSON.stringify({ name: 'registe', password: '12345678' } as IUser) }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toEqual('不存在用户!')
        })
    })

    test('测试登录_失败(密码错误)', () => {
        return request(koa.listen()).post(LoginUrl).send({ data: JSON.stringify({ identity: '8888@qq.com', password: '1234567' } as IUser) }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toEqual('密码错误!')
        })
    })
})