
const ffi = require('ffi-napi')
const ref = require('ref-napi')
const path = require('path')
const ioPath = path.join(__dirname, './screenshot.dll')

try {
    const myDll = new ffi.Library(ioPath, { 'Screenshot': [ref.types.CString, []] })
    const imgBase64 = myDll.Screenshot()
    process.send(imgBase64)
} catch (error) {
}
