import koa from 'koa'
import http from 'http'
import koaBody from 'koa-body'
import "reflect-metadata"
const cors = require('koa2-cors')
import logger from './common/logger'
import router from './router/router'
import { createConnection } from "typeorm";
import SocketIo from 'socket.io'
import { SocketIoService } from './common/socket.io'

createConnection().then(async connection => {
    let app = new koa()
    //app.use((ctx: Context) => { ctx.body = 'hello world' })
    app.use(koaBody({
        jsonLimit: 1024 * 1024 * 5,
        formLimit: 1024 * 1024 * 5,
        textLimit: 1024 * 1024 * 5,
        multipart: true,
        formidable: { maxFileSize: 200 * 1024 * 1024 }    // 设置上传文件大小最大限制，默认200M
    }));
    app.use(cors());
    app.use(router.routes())
    app.use(router.allowedMethods())
    const server = http.createServer(app.callback())
    const io = new SocketIo({ serveClient: false })
    io.attach(server, { serveClient: false, pingInterval: 10000, pingTimeout: 5000, cookie: false, origins: 'http://127.0.0.1:4100' })
    SocketIoService(io)
    server.listen(888)
    // server.on('close', () => {
    //     console.log('close')
    // })
    // setTimeout(() => {
    //     server.close()
    // }, 10000);
}).catch(err => logger.error(err))
