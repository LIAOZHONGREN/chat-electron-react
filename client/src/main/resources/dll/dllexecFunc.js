const path = require('path')
const child_process = require('child_process')
const { BrowserWindow } = require('electron')
const { writeFileSync } = require('fs')

let windowId = null

function screenshot() {
    try {
        const childPath = path.join(__dirname, './screenshot_process.js')
        const child = child_process.fork(childPath)
        const wins = BrowserWindow.getAllWindows()
        let win = null
        if (wins !== null && wins.length > 0) {
            win = windowId ? wins.find(w => w.id === windowId) : wins[0]
        }
        child.on('message', (v) => {
            const wins = BrowserWindow.getAllWindows();
            if (win) {
                win.webContents.send('dll', v)
            }
            child.kill();
        })
    } catch (error) {
    }
}


module.exports = { Screenshot: screenshot, windowId }