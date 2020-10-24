// //用于把从后台请求获得的user数据的headImg的DataUrl保存在电脑后记录它的路径和创建对应的url供应用使用
// import { writeFileSync, existsSync, readFileSync } from 'fs'
// import { join } from 'path'
// import { FileInfo } from '../net/model'
// import { CreateFolder, CreateObjectURL, DataUrlToFile } from '../tool/tools'

// const path = 'D:/chat/headimg'
// if (!existsSync(path)) CreateFolder(path)

// export function DataUrlToUrl(dataUrl: string, name: string): FileInfo {
//     const filePath = join(path, name + '.dataurl')
//     writeFileSync(filePath, dataUrl)
//     let file = new File([readFileSync(filePath)], name + '.dataurl')
//     const url = CreateObjectURL(file)
//     return { path: filePath, url: url } as FileInfo
// }

// export function FilePathToUrl(path: string): string {
//     if (!existsSync(path)) return ''
//     let file = new File([readFileSync(filePath)], path)
//     return CreateObjectURL(file)
// }