
import { existsSync, mkdirSync, readFileSync } from 'fs'

export function FileToDataUrl(file: File, callback: (res: string | ArrayBuffer) => void) {
    let fileR = new FileReader()
    fileR.readAsDataURL(file)
    fileR.onload = e => {
        if (callback) callback(e.target.result)
    }
}

export function DataUrlToFile(dataUrl: string, fileName: string): File {
    let arr = dataUrl.split(',')
    let mime = arr[0].match(/:(.*?);/)[1]
    let bStr = atob(arr[1])
    let n = bStr.length
    let u8arr = new Uint8Array(n)
    while (n--) {
        u8arr[n] = bStr.charCodeAt(n)
    }
    return new File([u8arr], fileName, { type: mime })
}

export function TrimAll(str: string): string {
    return str.replace(/\s+/g, "")
}

/*用正则表达式实现html编码（转义）*/
export function HtmlEncodeByRegExp(str: string): string {
    let temp = "";
    if (str.length == 0) return "";
    temp = str.replace(/&/g, "&amp;");
    temp = temp.replace(/</g, "&lt;");
    temp = temp.replace(/>/g, "&gt;");
    // temp = temp.replace(/\s/g, "&nbsp;");
    temp = temp.replace(/\'/g, "&#39;");
    temp = temp.replace(/\"/g, "&quot;");
    return temp;
}

export function TestToHtml(text: string): string {
    //1.首先动态创建一个容器标签元素，如DIV
    var temp = document.createElement("div")
    //2.然后将要转换的字符串设置为这个元素的innerHTML
    temp.innerHTML = HtmlEncodeByRegExp(text)
    //3.最后返回这个元素的innerText或者textContent
    var output = temp.innerText || temp.textContent
    temp = null;
    return output;
}

/*用正则表达式实现html解码（反转义）*/
export function HtmlDecodeByRegExp(str: string): string {
    let temp = "";
    if (str.length == 0) return "";
    temp = str.replace(/&amp;/g, "&");
    temp = temp.replace(/&lt;/g, "<");
    temp = temp.replace(/&gt;/g, ">");
    temp = temp.replace(/&nbsp;/g, " ");
    temp = temp.replace(/&#39;/g, "\'");
    temp = temp.replace(/&quot;/g, "\"");
    return temp;
}

export function IsObjectEqual<O>(o1: O, o2: O): boolean {
    const props1 = Object.getOwnPropertyNames(o1);
    const props2 = Object.getOwnPropertyNames(o2);
    if (props1.length != props2.length) {
        return false;
    }
    for (var i = 0, max = props1.length; i < max; i++) {
        var propName = props1[i];
        if (o1[propName] !== o2[propName]) {
            return false;
        }
    }
    return true;
}

export function IsJSONEqual(o1: any, o2: any): boolean {
    return JSON.stringify(o1 ? o1 : '') == JSON.stringify(o2 ? o2 : '')
}

export function DeepCopy<T>(t: T): T {
    if (!t) {
        return t
    }
    return JSON.parse(JSON.stringify(t)) as T
}

export function CreateObjectURL(object: any): string {
    return (window.URL) ? window.URL.createObjectURL(object) : window.webkitURL.createObjectURL(object);
}

export function ThroughFileInfoGetFileUrl(fileInfo: { path: string, name: string, type: string }): string {
    if (!existsSync(fileInfo.path)) return ''
    const data = readFileSync(fileInfo.path)
    const file = new File([data], fileInfo.name, { type: fileInfo.type });
    return CreateObjectURL(file)
}

export function CreateFolder(path: string) {
    const paths = path.split('/')
    let index = 1
    function recursion(path_: string) {
        if (!existsSync(path_)) mkdirSync(path_)
        index += 1
        if (index > paths.length) return
        recursion(paths.slice(0, index).join('/'))
    }
    recursion(paths[0])
}

export function ArrayToObject<T>(t: T[], attributeName: (index: number) => any): { [attributeName: any]: T } {
    let obj = {}
    t.forEach((v, i) => {
        obj[attributeName(i)] = v
    })
    return obj
}

export function ObjectToArray<T>(obj: { [attributeName: any]: T }): T[] {
    return Object.keys(obj).map(k => obj[k])
}

export function GetBase64Image(img: HTMLImageElement) {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, img.height);
    const ext = img.src.substring(img.src.lastIndexOf(".") + 1).toLowerCase();
    const dataURL = canvas.toDataURL("image/" + ext);
    return dataURL;
}

export function Base64ToUint8Array(base64String) {
    let padding = '='.repeat((4 - base64String.length % 4) % 4);
    let base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    let rawData = window.atob(base64);
    let outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}