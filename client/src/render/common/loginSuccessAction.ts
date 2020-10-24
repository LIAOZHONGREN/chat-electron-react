import { remote, ipcRenderer } from 'electron'
import { History } from 'history'
import { HomeUrl } from '../router/routerUrl'

//登录或注册成功后调整窗口后再跳转到home界面
export function LoginSuccessAction(history: History<{}>) {
    const win = remote.getCurrentWindow()
    win.hide()
    win.setSize(700, 560)
    win.setResizable(true)
    history.push(HomeUrl)
    ipcRenderer.send('create-tray')
}