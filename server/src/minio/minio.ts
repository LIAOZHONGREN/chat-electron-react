
import fs from 'fs'
import { File } from 'formidable'
import { Client, BucketItemStat } from 'minio'

function getMinioClient(): Client {
    return new Client({
        endPoint: '127.0.0.1',
        port: 9000,
        useSSL: false,
        accessKey: 'minioadmin',
        secretKey: 'minioadmin'
    })
}

const minioClient = getMinioClient()

const bucket = 'chat'

minioClient.bucketExists(bucket, function (err: Error, exists: boolean) {
    err ? console.log(err) : null
    exists ? console.log("Bucket:" + exists) : (() => {
        minioClient.makeBucket(bucket, 'us-east-1', function (err: Error) {
            if (err) console.log('Error creating bucket.', err)
            console.log('Bucket created successfully in "us-east-1".')
        })
    })()
})

function sleep(delay: number) {
    for (var t = Date.now(); Date.now() - t <= delay;) { }
}


export function GetFileUrlFromMinio(fileName: string, cb: (url: string, err?: Error) => void) {
    minioClient.presignedGetObject(bucket, fileName, (err: Error, url: string) => {
        err ? cb('', err) : cb(url)
    })
}

export function UploadFileToMinio(file: File, fileName: string, cb?: (url: string, err?: Error) => void) {
    minioClient.statObject(bucket, fileName, (err: Error, result: BucketItemStat) => {
        cb = cb ? cb : () => { }
        if (result) {
            GetFileUrlFromMinio(fileName, (url, err) => {
                err ? cb('', err) : cb(url)
            })
        } else {
            let readStream = fs.createReadStream(file.path)
            readStream.on('error', (err: Error) => { cb('', err) })
            minioClient.putObject(bucket, fileName, readStream, file.size, (err: Error, etag: any) => {
                if (err) {
                    cb('', err)
                    return
                }
                GetFileUrlFromMinio(fileName, (url, err) => {
                    if (err) {
                        cb('', err)
                        return
                    }
                    cb(url)
                })
            })
        }
    })
}

export default minioClient