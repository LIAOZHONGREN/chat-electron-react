
import { writeFileSync } from 'fs'
import { remote, ipcRenderer } from 'electron'
import { Base64ToUint8Array } from './tools'


export function Screenshot(): Promise<Uint8Array> {
    const dllfunc = remote.require("./resources/dll/dllexecFunc.js")
    dllfunc.windowId = remote.getCurrentWindow().id
    dllfunc.Screenshot()
    return new Promise((resolve, reject) => {
        ipcRenderer.once('dll', (e, args) => {
            const data = Base64ToUint8Array(args)
            resolve(data)
            // createImageBitmap(new Blob([data.buffer])).then(v => {
            //     resolve(v)
            // }).catch(e => {
            //     reject(e)
            // })
        })
    })
}

