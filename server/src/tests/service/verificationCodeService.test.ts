import { SendVerificationCodeToMailerService, VerificationCodeIsPassService } from '../../service/verificationCodeService'
import { GetVerificationCodeUrl, VerificationCodeUrl } from '../../router/url'
import { IUser } from '../../entity/user'
import { ResponseData } from '../../type'
import Koa from 'koa'
import koaBody from 'koa-body'
import Router from 'koa-router'
import request from 'supertest'

describe('verificationCodeService', () => {

    const koa = new Koa
    const router = new Router
    koa.use(koaBody({ jsonLimit: 1024 * 1024 * 5, formLimit: 1024 * 1024 * 5, textLimit: 1024 * 1024 * 5, multipart: true, formidable: { maxFileSize: 200 * 1024 * 1024 } }));
    router.post(GetVerificationCodeUrl, SendVerificationCodeToMailerService)
    router.post(VerificationCodeUrl, VerificationCodeIsPassService)
    koa.use(router.routes())

    // test('测试请求发送验证码_成功', () => {
    //     const user = { identity: '自行提供一个可以发送邮件的邮箱' } as IUser
    //     return request(koa.listen()).post(GetVerificationCodeUrl).send({ user: JSON.stringify(user) }).expect(200).then(res => {
    //         expect((res.body as ResponseData).err).toBeUndefined()
    //     })
    // })

    test('测试请求发送验证码_失败', () => {
        const user = { identity: '8888@qq.com' } as IUser
        return request(koa.listen()).post(GetVerificationCodeUrl).send({ user: JSON.stringify(user) }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toBeDefined()
        })
    })

    // test('测试验证验证码_验证通过', () => {
    //     const user = { identity: '8888@qq.com' } as IUser
    //     const code = '需要去redis处那个存在的验证信息'
    //     return request(koa.listen()).post(VerificationCodeUrl).send({ user: JSON.stringify(user), code: code }).expect(200).then(res => {
    //         expect((res.body as ResponseData).err).toBeUndefined
    //     })
    // })

    test('测试验证验证码_验证码错误', () => {
        const user = { identity: '8888@qq.com' } as IUser
        const code = '888888'
        return request(koa.listen()).post(VerificationCodeUrl).send({ user: JSON.stringify(user), code: code }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toEqual('验证码错误!')
        })
    })

    test('测试验证验证码_不存在验证信息', () => {
        const user = { identity: '@qq.com' } as IUser
        const code = '888888'
        return request(koa.listen()).post(VerificationCodeUrl).send({ user: JSON.stringify(user), code: code }).expect(200).then(res => {
            expect((res.body as ResponseData).err).toEqual('无法验证!(验证码过期或验证码与账号不匹配)')
        })
    })

})
