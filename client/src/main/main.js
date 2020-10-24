/**
 * 主进程入口文件
 */
const path = require('path');
const url = require('url')
const fs = require('fs')
const child_process = require('child_process')
const { execFile } = require('child_process')
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session } = require('electron');
const isDev = require('electron-is-dev');
require('dotenv').config();

let windowList = {}
let mainWindow = null;
function createMainWindow() {
  const url = isDev ? `http://localhost:${process.env.PORT}` : `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow = new BrowserWindow({
    show: false,
    minWidth: 700,
    minHeight: 560,
    useContentSize: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    autoHideMenuBar: true,//隐藏工具栏
    transparent: true,
    frame: false,//隐藏原生窗口控制栏
  });

  mainWindow.setSize(700, 560)
  //mainWindow.setResizable(true)

  //视图加载完成再显示窗口 在此事件后显示窗口将没有视觉闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.loadURL(url);
  mainWindow.webContents.openDevTools({ mode: 'detach' })
}

function createLoginWindow() {
  const url = isDev ? `http://localhost:${process.env.PORT}/loginAndRegister` : `file://${path.join(__dirname, `../dist/loginAndRegister.html`)}`;
  const loginWin = new BrowserWindow({
    show: false,
    minWidth: 500,
    minHeight: 500,
    resizable: false,
    maximizable: false,
    useContentSize: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    autoHideMenuBar: true,//隐藏工具栏
    transparent: true,
    frame: false,//隐藏原生窗口控制栏
  });
  loginWin.setSize(500, 500)
  loginWin.once('ready-to-show', () => { loginWin.show() })
  loginWin.loadURL(url);
  ipcMain.on('login-success', (event, arg) => {
    ipcMain.removeAllListeners('login-success')
    createMainWindow()
    loginWin.close()
  })
  loginWin.webContents.openDevTools({ mode: 'detach' })
}

//在最后一个窗口被关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('ready', () => {
  //createMainWindow()
  createLoginWindow()
})

//设置系统托盘
let tray = null
ipcMain.on('create-tray', (event, arg) => {

  tray = new Tray(path.join(__dirname, './resources/icon.ico'))
  const contextMenu = Menu.buildFromTemplate([
    { label: '退出应用', type: 'normal' }
  ])
  contextMenu.items[0].click = (menuItem, browserWindow, event) => {
    app.exit()
  }
  tray.setContextMenu(contextMenu)
  tray.setToolTip('chat')
  tray.on('click', () => {//点击托盘如果窗口是隐藏或最小化状态就把窗口显示在屏幕
    mainWindow.isVisible() ? null : mainWindow.show()
    mainWindow.isMinimized() ? mainWindow.restore() : null
  })
})

ipcMain.on('open-modal-win', (event, arg) => {

  const windowName = arg.windowName
  if (windowList[windowName]) {
    windowList[windowName].webContents.send('trigger')
    windowList[windowName].focus()
    return
  }

  !arg.controlMainWindow ? mainWindow.webContents.send('open-modal-win') : null
  const url = isDev ? `http://localhost:${process.env.PORT}${arg.path}` : `file://${path.join(__dirname, `../dist/${arg.path}.html`)}`
  const modalWin = new BrowserWindow({
    parent: !arg.controlMainWindow ? mainWindow : null,
    show: false,
    width: arg.width,
    height: arg.height,
    fullscreen: arg.fullscreen,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    autoHideMenuBar: true,//隐藏工具栏
    transparent: true,
    frame: false,//隐藏原生窗口控制栏
  })
  windowList[windowName] = modalWin
  arg.position ? modalWin.setPosition(arg.position[0], arg.position[1], true) : null
  modalWin.loadURL(url);
  const cookie = { url: url, name: modalWin.webContents.id + '', value: windowName }
  session.defaultSession.cookies.set(cookie).then(() => { }, (error) => { console.error(error) })
  modalWin.webContents.openDevTools({ mode: 'detach' })
  modalWin.once('ready-to-show', () => {
    if (arg.okShow) { modalWin.show() }
  });
  modalWin.on('close', () => {
    delete windowList[windowName]
  })
})

// ipcMain.on('screenshot', (event, arg) => {
//   // const screen_window = execFile(path.join(__dirname, 'screenshotFile/PrintScr.exe'))
//   // screen_window.on('exit', function (code) {
//   //   // 执行成功返回 1，返回 0 没有截图
//   //   if (code) {
//   //     event.reply('screenshot')
//   //   } else {
//   //     console.log('失败!')
//   //   }
//   // })


// })

//结束modal窗口,把modal窗口需要传给主窗口的数据发送给主窗口
ipcMain.on('end-modal-win', async (event, arg) => {
  const cookies = await session.defaultSession.cookies.get({ name: event.sender.id + '' })
  mainWindow.webContents.send(cookies[0].value, arg)
})

ipcMain.on('close-modal-win', async (event, arg) => {
  mainWindow.webContents.send('close-modal-win')
  const cookies = await session.defaultSession.cookies.get({ name: event.sender.id + '' })
  mainWindow.webContents.send(cookies[0].value, arg)
})

ipcMain.on('window-communication', async (event, arg) => {
  if (event.sender.id === mainWindow.webContents.id) {
    const win = windowList[arg.name]
    if (win) win.webContents.send('window-communication', arg)
  } else {
    const cookies = await session.defaultSession.cookies.get({ name: event.sender.id + '' })
    mainWindow.webContents.send(cookies[0].value, arg)
  }

})

ipcMain.on('logout', (event, arg) => {
  mainWindow.close()
  Object.values(windowList).forEach(w => { w.close() })
  createLoginWindow()
  tray.destroy()
})

ipcMain.on('exit-app', (event, arg) => {
  app.exit()
})

//app.whenReady().then(create_window);
