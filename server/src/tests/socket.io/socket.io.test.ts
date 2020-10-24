import io from 'socket.io-client'
import koa from 'koa'
import http from 'http'
import SocketIo from 'socket.io'
import { SocketIoService } from '../../common/socket.io'
import { OpenSocketTest } from './socketTest'
import { ConnectToDatabase } from '../../common/connectToDatabase'
import { SocketEmitData, FriendState, NewFriend } from '../../type'
import { getConnection } from 'typeorm'
import { User, GenderEnum } from '../../entity/user'
import { MyFriend } from '../../entity/myFriend'
import { ExistsAsync, Client, DelAsync } from '../../common/redis'

let users: User[]

beforeAll(async () => {
    await ConnectToDatabase()
    const query = getConnection().createQueryBuilder()
    //插入两条假User数据到数据库
    const insertResult = await query.insert().into(User).values([
        { identity: 'aaa@qq.com', name: 'aaa', password: 'aaa', gender: GenderEnum.girl, area: '广东广州', headImg: '' } as User,
        { identity: 'bbb@qq.com', name: 'bbb', password: 'bbb', gender: GenderEnum.girl, area: '广东广州', headImg: '' } as User,
    ]).execute()

    users = await query.select().from(User, 'u').where(`u.id in ("${insertResult.identifiers[0].id}","${insertResult.identifiers[1].id}")`).execute()
})

afterAll(async () => {
   // await getConnection().dropDatabase()//删除数据库及其所有数据
    getConnection().close()//关闭数据库连接
   // Client.flushdb()//删除redis所有key
});

describe('socket.io测试', () => {

    let app = new koa()
    const server = http.createServer(app.callback())
    const io = new SocketIo({ serveClient: false })
    io.attach(server, { serveClient: false, pingInterval: 10000, pingTimeout: 5000, cookie: false, origins: '*' })
    SocketIoService(io)

    test('与服务端握手', async () => {
        await OpenSocketTest(server.listen(888), 'http://127.0.0.1:888/chat').On('connection').TimeOut(4000).Execute().then(data => {
            expect(data[0]).toBe('ok')
        })
    })

    test('登录成功后与socket服务握手', async () => {
        await OpenSocketTest(server.listen(888), 'http://127.0.0.1:888/chat').Emit('login-success', { addresseeId: '', data: users[0].id } as SocketEmitData, 'ok').TimeOut(3000).Execute().then(res => {
            expect(res[0]).toBe('ok')
        })
    })


    test('addFriend测试_被加聊友方未在线', async () => {
        await OpenSocketTest(server.listen(888), 'http://127.0.0.1:888/chat').Emit('addFriend', { addresseeId: users[1].id, data: { state: FriendState.applying, user: users[0], authentication: '我是aaa', time: new Date() } as NewFriend } as SocketEmitData, 'ok').Execute().then(async res => {
            const exists = await ExistsAsync(users[1].id + 'msgkeys')
            expect(exists).toBe(1)
        })
    })


    test('addFriend测试_被加的聊友上线了', async () => {
        await OpenSocketTest(server.listen(888), 'http://127.0.0.1:888/chat').On('addFriend').Emit('login-success', { addresseeId: '', data: users[1].id } as SocketEmitData, 'ok').Execute().then(res => {
            expect([(res[0] as NewFriend).authentication, res[1]]).toEqual(['我是aaa', 'ok'])
        })
    })

    test('okFriend_接受', async () => {
        await DelAsync(users[0].id)//删除users[0]的登录信息
        await OpenSocketTest(server.listen(888), 'http://127.0.0.1:888/chat').Emit('okFriend', { addresseeId: users[0].id, data: { state: FriendState.pass, user: users[1], authentication: '', time: new Date() } as NewFriend } as SocketEmitData, 'ok').Execute().then(async res => {
            const exists = await ExistsAsync(users[0].id + 'msgkeys')
            const ms: MyFriend[] = await getConnection().createQueryBuilder().select().from(MyFriend, 'm').where(`m.myId in ("${users[0].id}","${users[1].id}")`).execute()
            expect([exists, ms.length]).toEqual([1, 2])
        })
    })


})

//yarn test D:/viewStudy/chat-electron-react/server/src/tests/socket.io/socket.io.test.ts