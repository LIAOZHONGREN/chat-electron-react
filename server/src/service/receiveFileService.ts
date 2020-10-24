import { ResponseData } from '../type'
import { Context } from 'koa'
import { UploadFileToMinio } from '../minio/minio'

export async function ReceiveFileService(ctx: Context) {
    const file = ctx.request.files.file
    const fileName = ctx.request.body.name
    try {
        const url = await new Promise<string>((resolve, reject) => {
            UploadFileToMinio(file, fileName, (url, err) => {
                if (err) reject(err)
                resolve(url)
            })
        })
        ctx.body = { data: { url: url } } as ResponseData
    } catch (err) {
        ctx.status = 500
        ctx.body = { err: '服务器生病了!' } as ResponseData
    }

}