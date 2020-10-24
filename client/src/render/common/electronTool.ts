
import { ipcRenderer, remote } from 'electron'
import WinReg from 'winreg'
import mtils from 'mtils'
import { WindowCommunicationData, WindowCommunicationType } from '../net/model';
const RUN_LOCATION = '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const file = process.execPath;

let flashTrayTimer = null;

export interface ModalWindowOptions {
    followParent: boolean | { x: number, y: number },
    communication?: (data: WindowCommunicationData) => void,//与主窗口的通讯函数
    controlMainWindow?: boolean,//打开后是否可以控制主窗口
    windowName?: string,//窗口名字
    okShow: boolean,//是否成功创建窗口就显示窗口(如何为false,自主通过代码控制显示)
    fullscreen?: boolean,//满屏显示
}

// 窗口最小化
export function MinWindow() {
    remote.getCurrentWindow().minimize();
}
// 窗口最大化
export function MaxWindow(isMaxed: boolean) {
    const browserWindow = remote.getCurrentWindow();
    if (!isMaxed) {
        browserWindow.unmaximize();
    } else {
        browserWindow.maximize();
    }
}
// 设置窗口是否能改变大小
export function SetResizable(resizable: boolean) {
    remote.getCurrentWindow().setResizable(resizable);
}
// 下载文件
export function Download(url: string) {
    remote.getCurrentWebContents().downloadURL(url);
}

// 隐藏窗口
export function HideWindow() {
    const browserWindow = remote.getCurrentWindow();
    browserWindow.hide();
}

// 显示窗口
export function ShowWindow() {
    const browserWindow = remote.getCurrentWindow();
    browserWindow.isVisible() ? null : browserWindow.show();
}
// 窗口闪烁
export function FlashFrame() {
    const browserWindow = remote.getCurrentWindow();
    //   if(browserWindow.isFocused() || browserWindow.isVisible())
    if (!browserWindow.isFocused()) {
        browserWindow.showInactive();
        browserWindow.flashFrame(true);
    }
}
// 设置窗口最前端显示
export function SetAlwaysOnTop(top: boolean) {
    const browserWindow = remote.getCurrentWindow();
    browserWindow.setAlwaysOnTop(top);
}

// 设置开机启动
export function EnableAutoStart(callback: (err: Error) => void) {
    let key = new WinReg({ hive: WinReg.HKCU, key: RUN_LOCATION });
    key.set('EUC', WinReg.REG_SZ, file, (err) => {
        console.log('设置自动启动' + err);
        callback(err);
    });
}
// 取消开机启动
export function DisableAutoStart(callback: (err: Error) => void) {
    let key = new WinReg({ hive: WinReg.HKCU, key: RUN_LOCATION });
    key.remove('EUC', (err) => {
        console.log('取消自动启动' + err);
        callback(err);
    });
}
// 获取是否开机启动
export function GetAutoStartValue(callback: (v: boolean) => void) {
    let key = new WinReg({ hive: WinReg.HKCU, key: RUN_LOCATION });
    key.get('EUC', function (error, result) {
        console.log("查询自动启动:" + JSON.stringify(result));
        console.log("file:" + file);
        if (result) {
            callback(true);
        }
        else {
            callback(false);
        }
    });
}

//controlMainWindow:用于控制打开窗口后是否可以操控主窗口
//windowName:用于判断窗口是否已经open 已经open就获取焦点,没打开就打开
export function OpenModalWin(width: number, height: number, path: string, options: ModalWindowOptions): { name: string, initData: (data: any) => void, sendData: (data: any) => void } {
    const { followParent, communication, controlMainWindow, windowName, okShow, fullscreen } = options
    const browserWindow = remote.getCurrentWindow()
    let pos = browserWindow.getPosition()
    pos = [pos[0] + 20, pos[1] + 20]
    pos = typeof followParent === 'object' ? [followParent.x, followParent.y] : (followParent ? pos : undefined)
    path.startsWith('/') ? null : path = '/' + path
    const windowName_ = windowName ? windowName : mtils.security.uuid(25, 16)
    const listener = (e: Electron.IpcRendererEvent, arg: WindowCommunicationData) => {
        communication ? communication(arg) : null
        if (arg.type == WindowCommunicationType.close || arg.type == WindowCommunicationType.end) ipcRenderer.removeListener(windowName_, listener)
    }
    ipcRenderer.removeAllListeners(windowName_)
    ipcRenderer.on(windowName_, listener)
    //初始modal窗口数据
    function initData(data: any) {
        const wcd: WindowCommunicationData = { name: windowName_, type: WindowCommunicationType.start, data: data }
        ipcRenderer.send('window-communication', wcd)
    }

    //向modal窗口发送数据
    function sendData(data: any) {
        const wcd: WindowCommunicationData = { name: windowName_, type: WindowCommunicationType.communication, data: data }
        ipcRenderer.send('window-communication', wcd)
    }

    ipcRenderer.send('open-modal-win', {
        width: width,
        height: height,
        path: path,
        position: pos,
        controlMainWindow: controlMainWindow === undefined ? true : controlMainWindow,
        windowName: windowName_,
        okShow: okShow === undefined ? true : okShow,
        fullscreen: fullscreen === undefined ? false : fullscreen
    })

    return { name: windowName_, initData: initData, sendData: sendData }
}

export function CloseWindow() {
    remote.getCurrentWindow().close()
}


/**
 * 托盘图标闪烁
 * @param flash true：闪烁；false：停止
 */
// export function FlashTray(flash: boolean) {
//     let hasIcon = false;
//     const tayIcon = ‘./imgs/logo.ico‘;
//     const tayIcon1 = ‘./imgs/empty.png‘;
//     if (flash) {
//         if (flashTrayTimer) {
//             return;
//         }
//         flashTrayTimer = window.setInterval(() => {
//             ipcRenderer.send(‘ChangeTrayIcon‘, hasIcon ? tayIcon : tayIcon1);
//             hasIcon = !hasIcon;
//         }, 500);
//     } else {
//         if (flashTrayTimer) {
//             window.clearInterval(flashTrayTimer);
//             flashTrayTimer = null;
//         }
//         ipcRenderer.send(‘ChangeTrayIcon‘, tayIcon);
//     }
// }



