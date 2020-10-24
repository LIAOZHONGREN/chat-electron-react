import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Loading from '../loading/Loading'
import { round } from 'lodash'
import './myList.scss'

type mode = '' | 'downLoading' | 'upLoading' | 'leftLoading' | 'rightLoading'

export interface IMyListProps {
    width?: number | string,
    height?: number | string,
    direction?: 'vertical' | 'horizontal',
    allow?: boolean,//是否允许加载
    modes?: mode[],
    padding?: number,
    onLoading?: () => Promise<T>

}

function numWHtoStrWH(w: number | string = 0, h: number | string = 0): { width: string, height: string } {
    return { width: typeof w === 'string' ? w : `${w}px`, height: typeof h === 'string' ? h : `${h}px` }
}

const MyList = React.forwardRef((props: IMyListProps, ref: React.Ref<HTMLDivElement>) => {

    const list = useRef<HTMLDivElement>()
    const { width, height, direction, allow, modes, padding, onLoading, children } = props
    const [wh, setwh] = useState(numWHtoStrWH(width, height))
    const [currentLoadingMode, setcurrentLoadingMode] = useState<mode>('')
    const [oldScrollTop, setoldScrollTop] = useState(0)
    const [oldScrollLeft, setoldScrollLeft] = useState(0)

    function onScroll(e: React.UIEvent<HTMLDivElement, UIEvent>) {

        if (currentLoadingMode !== '') return

        let mode: mode = ''
        const [scrollTop, scrollLeft] = [e.currentTarget.scrollTop, e.currentTarget.scrollLeft];
        const [isUp, isleft] = [oldScrollTop > scrollTop, oldScrollLeft > scrollLeft];//分号不可删除(移除会编译出不是你想要的结果)
        setoldScrollTop(scrollTop)
        setoldScrollLeft(scrollLeft)
        if (direction === 'vertical' || direction === undefined) {
            if (modes.indexOf('upLoading') > -1 && e.currentTarget.scrollTop === 0) {
                mode = 'upLoading'
            }

            else if (modes.indexOf('downLoading') > -1 && round(scrollTop) === round(e.currentTarget.scrollHeight - e.currentTarget.getBoundingClientRect().height)) {
                if (isUp) return
                mode = 'downLoading'
            }
        }

        else if (direction === 'horizontal') {
            if (modes.indexOf('leftLoading') > -1 && scrollLeft === 0) {
                mode = 'leftLoading'
            }

            else if (modes.indexOf('rightLoading') > -1 && round(scrollLeft) === round(e.currentTarget.scrollWidth - e.currentTarget.getBoundingClientRect().width)) {
                if (isleft) return
                mode = 'rightLoading'
            }
        }

        if (mode) {
            const scrollHeight = e.currentTarget.scrollHeight + 30
            const scrollLeft = e.currentTarget.scrollLeft + 30
            setcurrentLoadingMode(mode)
            if (onLoading) onLoading().finally(() => {
                if (direction === 'vertical') list.current.scrollTop = isUp ? list.current.scrollHeight - scrollHeight : scrollHeight
                else list.current.scrollLeft = isleft ? list.current.scrollLeft - scrollLeft : scrollLeft
                setcurrentLoadingMode('')
            })
        }
        // console.log(`scrollTop:${round(scrollLeft)};`, `scrollHeight:${round(e.currentTarget.scrollWidth - e.currentTarget.getBoundingClientRect().width)};`)
    }

    useImperativeHandle(ref, () => ({
        //提供父组件调用的方法,不提供表示滚动到底部,小于或等于0表示滚动到顶部
        goBottom: (position?: number) => {
            if (direction === 'horizontal') return
            if (position === undefined) {
                list.current.scrollTop = list.current.scrollHeight
                return
            }
            list.current.scrollTop = position > 0 ? position : 0
        },
        goRight: (position?: number) => {
            if (direction === 'vertical') return
            if (position === undefined) {
                list.current.scrollLeft = list.current.scrollWidth
                return
            }
            list.current.scrollLeft = position > 0 ? position : 0
        }
    }));

    useEffect(() => {
        setwh(numWHtoStrWH(width, height))
    }, [width, height])

    return (
        <div className={`my-list  ${currentLoadingMode}`} style={{ width: wh.width, height: wh.height }}>
            <div ref={list} onScroll={allow ? onScroll : null} className={`my-list-list ${direction ? direction : 'vertical'}`} style={padding ? { padding: `${padding}px` } : null}>
                {children}
            </div>
            <div className='up-loading'>
                <Loading text='loading' color='#bae7ff' size={10} loading={currentLoadingMode === 'upLoading'} fullScreen={false} mask={false} />
            </div>
            <div className='down-loading'>
                <Loading text='loading' color='#bae7ff' size={10} loading={currentLoadingMode === 'downLoading'} fullScreen={false} mask={false} />
            </div>
            <div className='left-loading'>
                <div className='loader-11'></div>
            </div>
            <div className='right-loading'>
                <div className='loader-11'></div>
            </div>
        </div>
    );
})

export default MyList