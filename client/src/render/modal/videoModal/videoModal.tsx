import React, { useState, useRef, useEffect } from 'react';
import ReactDom from 'react-dom'
import { CloseWindow, MinWindow, MaxWindow } from '../../common/electronTool'
import { VideoInfo, MsgType } from '../../net/model'
import { MyPopover } from '../../components/components'
import round from 'lodash/round'
import { GetFileType } from '../../common/getFileType';
import { DeepCopy, ThroughFileInfoGetFileUrl, CreateFolder } from '../../common/tools'
import { Space, Tooltip } from 'antd'
import { ipcRenderer } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { remote } from 'electron'
import '../../static/scss/main.scss'
import './videoModal.scss'
import { useModal } from '../useModal';

// let biasX = 0
// let biasY = 0
// const win = remote.getCurrentWindow()

// document.addEventListener('mousedown', (e) => {
//     [biasX, biasY] = [e.x, e.y]
//     document.addEventListener('mousemove', moveEvent)
// })

// document.addEventListener('mouseup', () => {
//     [biasX, biasY] = [0, 0]
//     document.removeEventListener('mousemove', moveEvent)
// })

// function moveEvent(e: MouseEvent) {
//     // window.moveTo(e.screenX - biasX, e.screenY - biasY)
//     win.setPosition(e.screenX - biasX, e.screenY - biasY, true)
// }

let openWindow = false

function readVideoList(fileInfo?: FileInfo): { videoList: VideoInfo[], targetVideo: VideoInfo } {
    let videoList: VideoInfo[] = []
    let targetVideo: VideoInfo = null
    if (existsSync('D:/chat/video/video-list.json')) videoList = JSON.parse(readFileSync('D:/chat/video/video-list.json', 'utf-8'))
    let index = 0
    if (fileInfo) {
        fileInfo.path ? delete fileInfo.url : null//如果是本地文件就把url删除,因为无法确定此url是否还有效
        let video: VideoInfo = { id: 0, name: fileInfo.name.split('.').reduce((pv, cv, i, a) => a.length - 1 === i ? pv : `${pv}.${cv}`), fileInfo: fileInfo, timeLength: '0:0' }
        if (videoList[0]?.name) {
            index = videoList.findIndex(v => v.name === video.name)
            if (index === -1) {
                index = video.id = videoList.length
                videoList.push(video)
            } else {
                video.id = index
                videoList[index] = video
            }
        } else {
            videoList = [video]
        }
    }

    if (videoList[0]?.name) {
        targetVideo = DeepCopy(videoList[index])
        !targetVideo.fileInfo.url ? targetVideo.fileInfo.url = ThroughFileInfoGetFileUrl(targetVideo.fileInfo) : null
    } else {
        videoList = []
    }
    //如果id和index不相等重新设置id
    if (videoList.length !== 0 && videoList.length !== (videoList[videoList.length - 1] + 1)) videoList.forEach((v, i) => { v.id = i })
    return { videoList: videoList, targetVideo: targetVideo }
}

export interface IModalProps {
}

export default function Modal(props: IModalProps) {


    const modal = useRef<HTMLDivElement>()
    const video = useRef<HTMLVideoElement>()
    const menuSwitch = useRef<HTMLInputElement>()
    const [videoList, setvideoList] = useState<VideoInfo[]>([])
    const [currentVideoInfo, setcurrentVideoInfo] = useState<VideoInfo | null>(null)
    const [volume, setvolume] = useState<number>(1)//音量
    const [speed, setspeed] = useState<number>(1)//播放速度
    const [isAdjust, setisAdjust] = useState<'' | 'volume' | 'speed' | 'progress' | 'videoJump' | 'videoMenu' | 'loading'>('')//用于判断是否正在调节视频参数来控制视频控件不消失
    const [progress, setprogress] = useState<number>(0)
    const [progress2, setprogress2] = useState<number>(0)
    const [mark, setmark] = useState<string | null>(null)
    const [isPlay, setisPlay] = useState<boolean>(false)
    const [duration, setduration] = useState<string>('')
    const [timer, settimer] = useState<string>('')
    const [isFullScreen, setisFullScreen] = useState<boolean>(false)
    const [isMaxSreen, setisMaxSreen] = useState<boolean>(false)
    const [closureFunc, setclosureFunc] = useState<{ [funcName: string]: (e: any) => void }>({ onMouseMove: onMouseMove(), onTimeUpdate: onTimeUpdate(), onFullScreen: onFullScreen(), maxWindowOrRestore: maxWindowOrRestore() })
    const { closeModal } = useModal({
        onCloseModal: () => {
            try {
                let path = 'D:/chat/video'
                if (!existsSync(path)) CreateFolder(path)
                writeFileSync(path + '/video-list.json', JSON.stringify(videoList))
            } catch (error) {
                //console.log(error)
            }
        },
        onInitData: data => {
            if (openWindow) {
                setcurrentVideoInfo(currentVideoInfo => {
                    if (data.data && data.data.name !== currentVideoInfo.fileInfo.name) updataVideoList(data.data)
                    return currentVideoInfo
                })
                return
            }
            const { videoList, targetVideo } = readVideoList(data.data)
            setvideoList(videoList)
            if (targetVideo) setisPlay(true)
            setcurrentVideoInfo(targetVideo)
            openWindow = true
        }
    })


    function updataVideoList(fileInfo: FileInfo) {
        fileInfo.path ? delete fileInfo.url : null//如果是本地文件就把url删除,因为无法确定此url是否还有效
        let video: VideoInfo = { id: 0, name: fileInfo.name.split('.')[0], fileInfo: fileInfo, timeLength: '0:0' }
        setvideoList(videoList => {

            let index = videoList.findIndex(v => v.name === video.name)
            if (index === -1) {
                index = video.id = videoList.length
                videoList.push(video)
            } else {
                video.id = index
                videoList[index] = video
            }
            setvideoList(videoList)
            setisPlay(true)
            switchVideo(0, videoList[index])
            return videoList
        })
    }

    //用于控制控件的显示和消失
    function onMouseMove() {
        let currentDate = Date.now()
        let timeout = null

        function recursion() {
            timeout ? clearTimeout(timeout) : null
            timeout = setTimeout(() => {
                //这样写是为了获取最新的isAdjust,如果不这样写获得的isAdjust始终是上一次的值,而不是当前值(闭包的原因)
                setisAdjust(isAdjust => {
                    if (isAdjust === '') {
                        modal.current.classList.remove('show-control')
                    } else {
                        recursion()
                    }
                    return isAdjust
                })
            }, 8000);
        }

        return (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            if (e.currentTarget !== e.target) return
            if (Date.now() - currentDate > 1000) {
                !modal.current.classList.contains('show-control') ? modal.current.classList.add('show-control') : null
                recursion()
                currentDate = Date.now()
            }
        }
    }

    //音量调节
    function adjustTheVolume(type: '+' | '-') {
        let volume = video.current.volume
        if (type === '+') {
            volume = volume + 0.02 >= 1 ? 1 : volume + 0.02
        } else {
            volume = volume - 0.02 <= 0 ? 0 : volume - 0.02
        }
        video.current.volume = round(volume, 2)
        setvolume(video.current.volume)
    }

    //鼠标滚轮调节音量
    function onWheelAdjustTheVolume(e: React.WheelEvent<HTMLElement>) {
        adjustTheVolume(e.deltaY < 0 ? '+' : '-')
    }

    //播放速度调节
    function governingSpeed(type: '+' | '-') {
        let rate = video.current.playbackRate
        if (type === '+') {
            rate = rate + 0.1 >= 2 ? 2 : rate + 0.1
        } else {
            rate = rate - 0.1 <= 0.1 ? 0.1 : rate - 0.1
        }
        video.current.playbackRate = round(rate, 1)
        setspeed(video.current.playbackRate)
    }

    //鼠标滚轮调节播放速度
    function onWheelGoverningSpeed(e: React.WheelEvent<HTMLElement>) {
        governingSpeed(e.deltaY < 0 ? '+' : '-')
    }

    //视频向前或向后快进5s
    function videoJump(type: '+' | '-') {
        if (video.current.duration <= 0 || !currentVideoInfo) return
        if (type === '+') {
            video.current.currentTime = video.current.currentTime + 5 > video.current.duration ? video.current.duration : (video.current.currentTime + 5)
        } else {
            video.current.currentTime = video.current.currentTime - 5 < 0 ? 0 : (video.current.currentTime - 5)
        }

    }

    //播放
    function play() {
        video.current.play()
        setisPlay(true)
    }

    //暂停
    function pause() {
        video.current.pause()
        setisPlay(false)
    }

    //点击对应视频,切换到此视频播放
    function switchVideo(index: number, video?: VideoInfo) {
        menuSwitch.current.checked ? menuSwitch.current.click() : null
        !isPlay ? setisPlay(true) : null
        video = DeepCopy(!video ? videoList[index] : video)
        !video.fileInfo.url ? video.fileInfo.url = ThroughFileInfoGetFileUrl(video.fileInfo) : null
        setcurrentVideoInfo(video)
    }

    //播放或暂停切换
    function onClickPlayPause() {
        if (!currentVideoInfo) return
        video.current.paused ? play() : pause()
    }

    //调节进度
    function onClickProgressBar(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (!currentVideoInfo) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.x
        video.current.currentTime = video.current.duration * x / rect.width
        setprogress(x / rect.width * 100)
    }

    //定位进度方便调节
    function onMouseMoveProgress(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        isAdjust !== 'progress' ? setisAdjust('progress') : null
        if (!currentVideoInfo) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.x
        setprogress2(x / rect.width * 100)
        const time = x / rect.width * video.current.duration
        setmark(`${parseInt(time / 60)} : ${parseInt(time % 60)}`)
    }

    //结束定位进度
    function onMouseOutProgress() {
        setisAdjust('')
        setprogress2(0)
        setmark(null)
    }

    function onClickStopVideo() {
        pause()
        setprogress(0)
        settimer('')
        setduration('')
        setcurrentVideoInfo(null)
        video.current.src = null
    }

    //调整窗口大小
    function computeWindowSize() {
        let [w, h] = [video.current.videoWidth, video.current.videoHeight]
        video.current.videoWidth >= 1000 ? [w, h] = [w / 2, h / 2] : null
        let bounds = remote.getCurrentWindow().getBounds()
        remote.getCurrentWindow().setBounds({ width: round(w), height: round(h), x: bounds.x, y: bounds.y }, true)
    }

    //最大化窗口或还原窗口
    function maxWindowOrRestore() {

        let bounds: Electron.Rectangle

        return () => {
            setisMaxSreen(isMaxSreen => {
                if (!isMaxSreen) {
                    bounds = remote.getCurrentWindow().getBounds()
                    MaxWindow(!isMaxSreen)
                } else {
                    MaxWindow(!isMaxSreen)
                    remote.getCurrentWindow().setBounds(bounds, true)
                }
                return !isMaxSreen
            })
        }
    }

    //全屏
    function onFullScreen() {
        let isFull = false

        return () => {
            remote.getCurrentWindow().setFullScreen(isFull = !isFull)
            if (isFull) {
                remote.getCurrentWindow().setBounds({ width: screen.width, height: screen.height })
            }
            setisFullScreen(isFull)
            !isFull ? setisMaxSreen(isMaxSreen => {
                if (isMaxSreen) {
                    closureFunc['maxWindowOrRestore']()
                }
                return isMaxSreen
            }) : null
        }

    }

    //添加视频
    function addVideo(files: FileList) {
        let videoFiles: File[] = []
        Array.from(files).forEach(v => {
            GetFileType(v) == MsgType.video ? videoFiles.push(v) : null
        })
        const index = videoList.length
        const videos = videoFiles.map((v, i) => ({ id: i + index, name: v.name.split('.')[0], fileInfo: { path: v.path, name: v.name, type: v.type }, timeLength: '0:0' } as VideoInfo))
        setvideoList(videoList.concat(videos))
        !menuSwitch.current.checked ? menuSwitch.current.click() : null
    }

    //移除视频
    function onClickRemoveVideo(index: number) {
        let newVideoList = [...videoList]
        newVideoList.splice(index, 1)
        setvideoList(newVideoList)
    }

    //点击screen,关闭菜单
    function onClickScreen(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (e.target !== e.currentTarget) return
        menuSwitch.current.checked ? menuSwitch.current.click() : null
    }

    //视频就绪事件
    function onCanPlay() {
        setduration(`${parseInt(video.current.duration / 60)} : ${parseInt(video.current.duration % 60)} `)
        settimer(`${parseInt(video.current.currentTime / 60)} : ${parseInt(video.current.currentTime % 60)} `)
        //更新歌曲时长
        if (currentVideoInfo.timeLength === '0:0') {
            let newVideoList = [...videoList]
            newVideoList.some(v => {
                if (v.id === currentVideoInfo.id) v.timeLength = `${parseInt(video.current.duration / 60)} : ${parseInt(video.current.duration % 60)} `
                return v.id === currentVideoInfo.id
            })
            setvideoList(newVideoList)
        }
        setprogress(video.current.currentTime / video.current.duration * 100)
        setvolume(video.current.volume)
        isPlay ? play() : null
    }

    //视频播放的进度更新事件(播放过程中不断调用)
    function onTimeUpdate() {
        let beforeTime = Date.now()
        return () => {
            let currentTime = Date.now()
            if (currentTime - beforeTime >= 999) {
                beforeTime = currentTime
                settimer(`${parseInt(video.current.currentTime / 60)} : ${parseInt(video.current.currentTime % 60)} `)
                setprogress(video.current.currentTime / video.current.duration * 100)
            }
        }
    }

    //歌曲结束事件
    function onEnded() {
        setprogress(100)
        setTimeout(() => {
            video.current.currentTime = 0
            setisPlay(false)
            setprogress(0)
        }, 1000);
    }

    useEffect(() => {
        if (!openWindow) {
            const { videoList, targetVideo } = readVideoList()
            setvideoList(videoList)
            setcurrentVideoInfo(targetVideo)
            openWindow = true
        }
    }, [])

    useEffect(() => {
        let timeout = null
        let onKeydown = (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                    if (isAdjust === 'volume' || !isAdjust) {
                        !isAdjust ? setisAdjust('volume') : null
                        adjustTheVolume('+')
                    } else if (isAdjust === 'speed') {
                        governingSpeed('+')
                    }
                    break;
                case 'ArrowDown':
                    if (isAdjust === 'volume' || !isAdjust) {
                        !isAdjust ? setisAdjust('volume') : null
                        adjustTheVolume('-')
                    } else if (isAdjust === 'speed') {
                        governingSpeed('-')
                    }
                    break;
                case 'ArrowLeft':
                    videoJump('-')
                    break;
                case 'ArrowRight':
                    videoJump('+')
                    break;
                case ' ':
                    onClickPlayPause()
                    break;

                default:
                    break;
            }
        }
        let onKeyUp = () => {
            timeout ? clearTimeout(timeout) : null
            timeout = setTimeout(() => { isAdjust === 'volume' ? setisAdjust('') : null }, 1000);
        }
        document.addEventListener('keydown', onKeydown)
        document.addEventListener('keyup', onKeyUp)
        return () => {
            document.removeEventListener('keydown', onKeydown)
            document.removeEventListener('keyup', onKeyUp)
        }
    }, [isAdjust])

    return (
        <div className='video-modal' ref={modal}>
            <video ref={video} src={currentVideoInfo?.fileInfo.url} width={'100%'} height={'100%'}
                onWaiting={() => { setisAdjust('loading') }}
                onPlaying={() => { isAdjust === 'loading' ? setisAdjust('') : null }}
                onCanPlay={onCanPlay}
                onEnded={onEnded}
                onTimeUpdate={closureFunc['onTimeUpdate']}
                onLoadedMetadata={computeWindowSize} />
            <input ref={menuSwitch} type='checkbox' value='none' id='openMenu' name='check' />
            <div className='screen' onMouseMove={closureFunc['onMouseMove']} onClick={onClickScreen}>
                <div className={`adjustment-tips ${isAdjust === 'volume' ? 'show' : ''}`}>
                    <Space size={10}>
                        <i className={`fa fa-volume-${volume <= 0 ? 'off' : (volume <= 0.5 ? 'down' : 'up')} `} style={{ fontSize: '30px' }} />
                        <div>{`${round(volume * 100)}%`}</div>
                    </Space>
                </div>
                <div className={`adjustment-tips ${isAdjust === 'speed' ? 'show' : ''}`}> {`${speed === 1 ? '正常' : speed}x`}</div>
                <div className={`adjustment-tips ${isAdjust === 'loading' ? 'show' : ''}`}><i className="fa fa-spinner fa-pulse fa-4x"></i></div>

                <div className='video-menu' onMouseMove={() => { isAdjust !== 'videoMenu' ? setisAdjust('videoMenu') : null }} onMouseOut={() => { setisAdjust('') }}>
                    {
                        videoList.map((v, i) => (
                            <MyPopover menuContent={
                                <div className='popover-menu'>
                                    <div className='menu-remove-but' onClick={() => { onClickRemoveVideo(i) }}>移除</div>
                                </div>
                            } key={i + v.name}>
                                <table>
                                    <tbody>
                                        <tr onClick={() => { switchVideo(i) }}>
                                            <td className="nr"><h5>{i + 1}</h5></td>
                                            <td className="title"><h6 style={v.name === currentVideoInfo?.name ? { color: '#ff564c' } : {}}>{v.name}</h6></td>
                                            <td className="length"><h5>{v.timeLength === '0:0' ? '未知' : v.timeLength}</h5></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </MyPopover>
                        ))
                    }
                </div>
            </div>

            <div className='video-name'><h5>{currentVideoInfo?.name}</h5></div>

            <div className='minimize-close'>
                <table>
                    <tbody>
                        <tr>
                            <td><i onClick={MinWindow} className="fa fa-minus" /></td>
                            {
                                !isFullScreen ? <td><i onClick={closureFunc['maxWindowOrRestore']} className={`fa fa-${!isMaxSreen ? 'expand' : 'compress'}`} /></td> : null
                            }
                            <td><i onClick={() => { closeModal() }} className="fa fa-remove" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className='menu-and-add-control'>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <Tooltip placement='left' title='添加视频'>
                                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                                        <i className="fa fa-plus" />
                                        <input onChange={v => { addVideo(v.target.files) }} className='input-add-video' type="file" multiple={true} title=' ' />
                                    </div>
                                </Tooltip>
                            </td>
                            <td>
                                <Tooltip placement='left' title='视频菜单'>
                                    <label className='menu-icon' htmlFor='openMenu'><i className="fa fa-reorder" /></label>
                                </Tooltip>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className='video-position-progress-value' style={{ display: mark ? 'inline-flex' : 'none' }}>{mark}</div>

            <div className='video-control'>

                <div className='video-progress-bar' onClick={onClickProgressBar} onMouseMove={onMouseMoveProgress} onMouseOut={onMouseOutProgress}>
                    <div className='timer'>{timer}</div>
                    <div className='duration'>{duration}</div>
                    <div className='progress2' style={{ width: `${progress2}% ` }} />
                    <div className='progress' style={{ width: `${progress}% ` }} />
                </div>

                <table>
                    <tbody>
                        <tr>
                            <td><i onClick={onClickPlayPause} className={`fa fa-${!isPlay ? 'play' : 'pause'} `} /></td>
                            <td><i
                                onMouseMove={() => { isAdjust !== 'videoJump' ? setisAdjust('videoJump') : null }}
                                onMouseOut={() => { setisAdjust('') }}
                                onClick={() => { videoJump('-') }}
                                className="fa fa-step-backward" />
                            </td>
                            <td><i
                                onMouseMove={() => { isAdjust !== 'videoJump' ? setisAdjust('videoJump') : null }}
                                onMouseOut={() => { setisAdjust('') }}
                                onClick={() => { videoJump('+') }}
                                className="fa fa-step-forward" />
                            </td>
                            <td
                                onWheel={onWheelGoverningSpeed}
                                onMouseMove={() => { isAdjust !== 'speed' ? setisAdjust('speed') : null }}
                                onMouseOut={() => { setisAdjust('') }}
                                style={{ fontSize: '10px', fontWeight: 'bold' }}>
                                <Tooltip placement='top' title='滚轮调节'>倍速</Tooltip>
                            </td>
                            <td>
                                <Tooltip placement='top' title='滚轮调节'>
                                    <i
                                        onWheel={onWheelAdjustTheVolume}
                                        onMouseMove={() => { isAdjust !== 'volume' ? setisAdjust('volume') : null }}
                                        onMouseOut={() => { setisAdjust('') }}
                                        className={`fa fa-volume-${volume <= 0 ? 'off' : (volume <= 0.5 ? 'down' : 'up')} `}
                                        style={{ fontSize: '15px' }} />
                                </Tooltip>
                            </td>
                            <td><i onClick={onClickStopVideo} className="fa fa-stop" /></td>
                            <td><i onClick={closureFunc['onFullScreen']} className={`fa fa-${!isFullScreen ? 'expand' : 'compress'}`} /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div >
    );
}


(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))