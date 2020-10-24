
import http from 'http'
import * as io from 'socket.io-client'

enum eventType {
    on,
    emit
}

class socketTest {

    private server: http.Server
    private socket: SocketIOClient.Socket
    private timeOut: number
    private events: Array<{ type: eventType, event: string, data: any, respData: any }>

    constructor(server: http.Server, path: string) {
        this.server = server
        this.socket = io.connect(path)
        this.events = new Array<{ type: eventType, event: string, data: any, respData: any }>()
        this.timeOut = 5000
    }

    public On(event: string | Array<string>): socketTest {
        typeof event === 'string' ? this.events.push({ type: eventType.on, event: event, data: '', respData: '' }) : (() => {
            event.forEach((v, i, a) => {
                this.events.push({ type: eventType.on, event: v, data: '', respData: '' })
            })
        })()
        return this
    }

    public Emit(event: string, data: any, respData: any): socketTest {
        this.events.push({ type: eventType.emit, event: event, data: data, respData: respData })
        return this
    }

    public EmitArr(event: { event: string, data: any, respData: any } | Array<{ event: string, data: any, respData: any }>): socketTest {
        event instanceof Array ? (() => {
            event.forEach((v, i, a) => {
                this.events.push({ type: eventType.emit, event: v.event, data: v.data, respData: v.respData })
            })
        })() : this.events.push({ type: eventType.emit, event: event.event, data: event.data, respData: event.respData })
        return this
    }

    public TimeOut(millisecond: number) {
        this.timeOut = millisecond
        return this
    }

    //执行完成返回的结果数组的顺序是调用的先后顺序
    public Execute(): Promise<any[]> {

        let proArr = new Array<Promise<any>>()
        if (this.events.length > 0) {
            this.events.forEach((v, i, a) => {
                proArr.push(new Promise((resolve, reject) => {
                    if (v.type == eventType.on) {
                        this.socket.on(v.event, (data: any, cb: () => void) => {
                            if (cb) cb()
                            resolve(data)
                        })
                    } else {
                        this.socket.emit(v.event, v.data, () => {
                            resolve(v.respData)
                        })
                    }
                }))
            })
        }

        return new Promise((resolve, reject) => {
            const t = setTimeout(() => {
                this.server.close()
                reject(new Error("overtime"))
            }, this.timeOut);
            Promise.all(proArr).then(values => {
                clearTimeout(t)
                setTimeout(() => {
                    this.server.close()
                    resolve(values)
                }, 3);
            }).catch(err => {
                clearTimeout(t)
                reject(err)
            })
        })

    }

    public On2(event: string): Promise<any> {

        return new Promise((resolve, reject) => {
            const t = setTimeout(() => {
                this.server.close()
                reject(new Error("overtime"))
            }, this.timeOut);

            this.socket.on(event, (data: any, cb: () => void) => {
                clearTimeout(t)
                if (cb) cb()
                setTimeout(() => {
                    this.server.close()
                    resolve(data)
                }, 3);
            })
        })
    }


    public Send(event: string, data: any, respData: any): Promise<any> {

        return new Promise((resolve, reject) => {
            const t = setTimeout(() => {
                this.server.close()
                reject(new Error("overtime"))
            }, this.timeOut);
            this.socket.emit(event, data, () => {
                clearTimeout(t)
                this.server.close()
                resolve(respData)
            })
        })

    }

}

export function OpenSocketTest(server: http.Server, path: string): socketTest {
    return new socketTest(server, path)
}