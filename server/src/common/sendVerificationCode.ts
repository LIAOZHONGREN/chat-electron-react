import { Client } from './redis'
import logger from './logger'
const mtils = require('mtils')
const nodeMailer = require('nodemailer')

const fromMailer = '3167476587@qq.com'

const transporter = nodeMailer.createTransport({
    host: "smtp.qq.com", //邮件发送的域名，我们这里使用的是QQ的服务
    port: 587,    // SMTP端口号
    secure: false,   //secure:true for port 465, secure:false for port 587
    auth: {
        user: fromMailer,  //邮件发送方的邮箱
        pass: ""   //我们开启POP服务生成的授权码
    }
})

export interface IVerificationInfo {
    code: string,
}

export function SendVerificationCode(toMailer: string): Promise<any> {
    const vCode = mtils.security.random(6) + ''
    const mailOptions = {
        from: fromMailer,    //发件箱
        to: toMailer,     //收件箱地址
        subject: "[验证码]:",      //邮件的标题
        html: `<div><p>
                 <span><strong>chat发来的验证码：</strong></span>
                 <span>${vCode}</span>
               </p><div>`
    }
    return new Promise((resolve, reject) => {
        Client.set(toMailer, JSON.stringify({ code: vCode } as IVerificationInfo), (err, reply) => {
            if (err) {
                logger.error('无法把验证信息记录到redis:', err)
                reject(err)
                return
            }
            Client.expire(toMailer, 3600, (err, reply) => {
                if (err) {
                    logger.error('设置验证信息的有效时间失败!')
                    reject(err)
                    return
                }
                transporter.sendMail(mailOptions, (err: Error, info: any) => {
                    err ? (() => { logger.error('发送验证码邮件发生错误:', err); reject(err) })() : resolve()
                })
            })
        })
    })
}