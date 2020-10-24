import React, { useRef, useEffect, useState } from 'react';
import './myPopover.scss'

export interface IMyPopoverProps {
    hide?: boolean,//它发生改变后会关闭菜单
    menuContent?: any
}

export default function MyPopover(props: IMyPopoverProps) {

    const { hide, menuContent, children } = props
    const menu = useRef<HTMLDivElement>()
    const [menuCon, setmenuCon] = useState<JSX.Element>(typeof menuContent === 'function' ? menuContent() : menuContent)

    function loseFocus() {
        if (menu.current.classList.contains('open')) {
            menu.current.classList.remove('open')
        }
    }

    function onRightClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        typeof menuContent === 'function' ? setmenuCon(menuContent()) : null
        const [x, y] = [e.clientX, e.clientY]
        if (!menu.current.classList.contains('open')) {
            menu.current.style.top = `${y}px`
            menu.current.style.left = `${x}px`
            menu.current.classList.add('open')
        } else {
            setTimeout(() => {
                menu.current.style.top = `${y}px`
                menu.current.style.left = `${x}px`
                menu.current.classList.add('open')
            }, 500);
            menu.current.classList.remove('open')
        }
        menu.current.focus()
        menu.current.onblur = loseFocus
    }

    function onMouseMove_menu() {
        menu.current.onblur = null
    }

    function onMouseOut_menu() {
        menu.current.focus()
        menu.current.onblur = loseFocus
    }

    function onClickMenu(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (e.target !== e.currentTarget) loseFocus()
    }

    useEffect(() => {
        loseFocus()
    }, [hide])

    return (
        <div className='my-popover'>
            <div className='my-popover-menu' style={{ position: 'fixed', display: 'inline-block', zIndex: '99', outline: 0 }} tabIndex="0" ref={menu} onClick={onClickMenu} onMouseMove={onMouseMove_menu} onMouseOut={onMouseOut_menu}>
                {
                    menuCon
                }
            </div>
            <div style={{ position: 'relative', display: 'inline-flex' }} onContextMenu={onRightClick}>
                {children}
            </div>
        </div>
    );
}
