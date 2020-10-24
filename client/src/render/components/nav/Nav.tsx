import React, { useState } from 'react';
import './nav.scss'
import { ipcRenderer } from 'electron'
import { MinWindow, MaxWindow, HideWindow } from '../../common/electronTool'

export type positionType = 'relative' | 'absolute'

export interface INavProps {
    position?: positionType
    children?: Element
    height?: number
}

export default function Nav(props: INavProps) {

    const { children, height, position } = props
    const [isMaxedWindow, setisMaxedWindow] = useState<boolean>(false)

    function maximizeWindow() {
        MaxWindow(!isMaxedWindow)
        setisMaxedWindow(!isMaxedWindow)
    }

    return (
        <div className='nav' style={{ position: position ? position : 'relative', top: 0, left: 0, height: height ? `${height}px` : '40px' }}>
            <div className='nav-window-control'>
                <img width={15} onClick={MinWindow} src={require('@render/static/svg/最小化.svg').default} alt="" />
                {isMaxedWindow ?
                    <img width={15} onClick={maximizeWindow} src={require('@render/static/svg/缩小.svg').default} alt="" /> :
                    <img width={15} onClick={maximizeWindow} src={require('@render/static/svg/放大.svg').default} alt="" />}
                <img width={15} onClick={HideWindow} src={require('@render/static/svg/关闭.svg').default} alt="" />
            </div>
            {children}
        </div>
    );
}
