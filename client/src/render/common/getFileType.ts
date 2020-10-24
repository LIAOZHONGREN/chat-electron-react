import { MsgType } from "../net/model"


const imgFormat = new Set(["jpg", "png", "gif", "jpeg", "bmp"])
const videoFormat = new Set(["avi", "wmv", "rm", "rmvb", "mpeg1", "mpeg2", "mp4", "3gp", "asf", "swf", "vob", "dat", "mov", "m4v", "flv", "f4v", "mkv", "mts", "ts"])
const musicFormat = new Set(["mp3", "wma", "flac", "aac", "mmf", "amr", "m4a", "m4r", "ogg", "mp2", "wav", "wv"])
const zipFormat = new Set(['zip', 'rar', 'cab', 'iso', 'jar', '7z'])
const wordFormat = new Set(['doc', 'docx'])
const excelFormat = new Set(['xls', 'xlsx'])
const pdfFormat = new Set(['pdf'])
const pptFormat = new Set(['ppt', 'pps', 'pptx', 'ppsx'])
const txtFormat = new Set(['txt'])
const xmlFormat = new Set(['xml', 'html'])



export function GetFileType(file: File): MsgType {
    const format = file.name.split(".").pop()
    if (imgFormat.has(format.toLowerCase())) {
        return MsgType.img
    } else if (videoFormat.has(format.toLowerCase())) {
        return MsgType.video
    } else if (musicFormat.has(format.toLowerCase())) {
        return MsgType.music
    } else if (zipFormat.has(format.toLowerCase())) {
        return MsgType.zip
    } else if (wordFormat.has(format.toLowerCase())) {
        return MsgType.word
    } else if (excelFormat.has(format.toLowerCase())) {
        return MsgType.excel
    } else if (pdfFormat.has(format.toLowerCase())) {
        return MsgType.pdf
    } else if (pptFormat.has(format.toLowerCase())) {
        return MsgType.ppt
    } else if (txtFormat.has(format.toLowerCase())) {
        return MsgType.txt
    } else if (xmlFormat.has(format.toLowerCase())) {
        return MsgType.xml
    } else {
        return MsgType.unknown
    }
}

const typeSet = new Set([MsgType.notice, MsgType.text, MsgType.withdraw])//非文件类型的消息
export function IsFileMsg(msgType: MsgType) {
    return !typeSet.has(msgType)
}