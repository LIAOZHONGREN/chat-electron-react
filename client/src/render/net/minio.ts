
import fs from 'fs'
const Minio = require('minio')
const BMF = require('browser-md5-file');
const bmf = new BMF();

function getMinioClient(): Minio.Client {
    return new Minio.Client({
        endPoint: '127.0.0.1',
        port: 9000,
        useSSL: false,
        accessKey: 'minioadmin',
        secretKey: 'minioadmin'
    })
}

let minioClient = getMinioClient()

const bucket = 'chat'

minioClient.bucketExists(bucket, function (err, exists) {
    err ? console.log(err) : null
    exists ? console.log("Bucket:" + exists) : (() => {
        minioClient.makeBucket(bucket, 'us-east-1', function (err) {
            if (err) console.log('Error creating bucket.', err)
            console.log('Bucket created successfully in "us-east-1".')
        })
    })()
})

function sleep(delay: number) {
    for (var t = Date.now(); Date.now() - t <= delay;) { }
}

export function UploadFileToMinio(file: File, progressListener?: (progress: number) => void, cb?: (fileName: string, err?: Error) => void) {
    const format = file.name.split(".").pop()
    bmf.md5(file, (err: Error, md5: string) => {
        const fileName = `${md5}.${format}`
        let readStream = fs.createReadStream(file.path)
        progressListener = progressListener ? progressListener : () => { }
        let currentTime = Date.now()
        readStream.on('data', () => {
            const progress = (readStream.bytesRead / file.size) * 100
            if ((Date.now() - currentTime) > 300 || progress === 100) {
                progressListener(progress)
                currentTime = Date.now()
            }
        })
        readStream.on('end', () => { })
        readStream.on('error', (err) => { })
        cb = cb ? cb : () => { }
        minioClient.putObject(bucket, fileName, readStream, file.size, (err, etag) => {
            cb(fileName, err)
        })
    })
}

export function GetFileUrlFromMinio(fileName: string, cb: (url: string, err: Error) => void) {
    minioClient.presignedGetObject(bucket, fileName, (err, url) => {
        err ? cb('', err) : cb(url)
    })
}

export default minioClient