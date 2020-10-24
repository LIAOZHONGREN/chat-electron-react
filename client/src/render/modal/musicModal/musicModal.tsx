import React, { useState, useEffect, useRef } from 'react';
import ReactDom from 'react-dom'
import { CloseWindow, MinWindow } from '../../common/electronTool'
import { ipcRenderer } from 'electron'
import '../../static/scss/main.scss'
import './musicModal.scss'
import { FileInfo, MsgType, MusicInfo, WindowCommunicationType, WindowCommunicationData } from '../../net/model'
import { MyPopover } from '../../components/components'
import { DeepCopy, CreateFolder, ThroughFileInfoGetFileUrl } from '../../common/tools';
import random from 'lodash/random'
import { Tooltip } from 'antd'
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { GetFileType } from '../../common/getFileType';
import { round } from 'lodash';
import { useModal } from '../useModal';

let openWindow = false

function readMusicList(fileInfo?: FileInfo): { musicList: MusicInfo[], targetMusic: MusicInfo } {
    let targetMusic: MusicInfo | null = null
    let musicList: MusicInfo[] = []
    if (existsSync('D:/chat/music/music-list.json')) musicList = JSON.parse(readFileSync('D:/chat/music/music-list.json', 'utf-8'))
    let index = 0
    if (fileInfo) {
        fileInfo.path ? delete fileInfo.url : null//如果是本地文件就把url删除,因为无法确定此url是否还有效
        let music: MusicInfo = { id: 0, name: fileInfo.name.split('.').reduce((pv, cv, i, a) => a.length - 1 === i ? pv : `${pv}.${cv}`), fileInfo: fileInfo, timeLength: '0:0', love: false }
        if (musicList[0]?.name) {
            index = musicList.findIndex(v => v.name === music.name)
            if (index === -1) {
                index = music.id = musicList.length
                musicList.push(music)
            } else {
                music.id = index
                musicList[index] = music
            }
        } else {
            musicList = [music]
        }
    }

    if (musicList[0]?.name) {
        targetMusic = DeepCopy(musicList[index])
        !targetMusic.fileInfo.url ? targetMusic.fileInfo.url = ThroughFileInfoGetFileUrl(targetMusic.fileInfo) : null
    } else {
        musicList = []
    }
    //如果id和index不相等重新设置id
    if (musicList.length !== 0 && musicList.length !== (musicList[musicList.length - 1] + 1)) musicList.forEach((v, i) => { v.id = i })
    return { musicList: musicList, targetMusic: targetMusic }
}


export interface IModalProps {
}

export default function Modal(props: IModalProps) {

    const [musicList, setmusicList] = useState<MusicInfo[]>([])
    const [lovePlay, setlovePlay] = useState<boolean>(false)//只播放喜欢的
    const [randomPlay, setrandomPlay] = useState<boolean>(false)//随机播放
    const [repeatPlay, setrepeatPlay] = useState<boolean>(false)//单曲循环
    const [currentPlaying, setcurrentPlaying] = useState<MusicInfo | null>(null)
    const audio = useRef<HTMLAudioElement>()
    const [progress, setprogress] = useState<number>(0)
    const [progress2, setprogress2] = useState<number>(0)
    const [mark, setmark] = useState<string | null>(null)
    const [speed, setspeed] = useState<number>(1)//播放速度
    const [isPlay, setisPlay] = useState<boolean>(false)
    const [duration, setduration] = useState<string>('')
    const [timer, settimer] = useState<string>('')
    const [volume, setvolume] = useState<number>(1)
    const [closureFunc, setclosureFunc] = useState<{ [funcName: string]: (e: any) => void }>({ onTimeUpdate: onTimeUpdate() })
    const { closeModal } = useModal({
        onCloseModal: () => {
            const path = 'D:/chat/music'
            try {
                if (!existsSync(path)) CreateFolder(path)
                writeFileSync(path + '/music-list.json', JSON.stringify(musicList))
            } catch (error) {
                //console.log(error)
            }
        },
        onInitData: data => {
            if (openWindow) {
                setcurrentPlaying(currentPlaying => {
                    if (data.data && data.data.name !== currentPlaying?.fileInfo.name) updataMusicList(data.data)
                    return currentPlaying
                })
                return
            }
            const { musicList, targetMusic } = readMusicList(data.data)
            setmusicList(musicList)
            if (targetMusic) setisPlay(true)
            setcurrentPlaying(targetMusic)
            openWindow = true
        }
    })

    //主窗口再次打开音乐播放窗口播放音乐,切换到主窗口提供的音乐,如果音乐列表不存在此音乐就更新列表
    function updataMusicList(fileInfo: FileInfo) {
        fileInfo.path ? delete fileInfo.url : null//如果是本地文件就把url删除,因为无法确定此url是否还有效
        let music: MusicInfo = { id: 0, name: fileInfo.name.split('.')[0], fileInfo: fileInfo, timeLength: '0:0', love: false }
        setmusicList(musicList => {
            let index = musicList.findIndex(v => v.name === music.name)
            if (index === -1) {
                index = music.id = musicList.length
                musicList.push(music)
            } else {
                music.id = index
                musicList[index] = music
            }
            setmusicList(musicList)
            setisPlay(true)
            switchMusic(0, musicList[index])
            return musicList
        })
    }

    //设置为喜爱或剔除出喜爱
    function setToLoveMusic(musicId: string) {
        let newMusicList = [...musicList]
        newMusicList.some(v => {
            if (v.id === musicId) v.love = !v.love
            return v.id === musicId
        })
        setmusicList(newMusicList)
        if (musicId === currentPlaying.id) {
            let newCurrentPlaying = { ...currentPlaying }
            newCurrentPlaying.love = !newCurrentPlaying.love
            setcurrentPlaying(newCurrentPlaying)
        }
    }

    //点击对应歌曲,切换到此歌曲播放
    function switchMusic(index: number, music?: MusicInfo) {
        !isPlay ? setisPlay(true) : null
        music = DeepCopy(!music ? musicList[index] : music)
        !music.fileInfo.url ? music.fileInfo.url = ThroughFileInfoGetFileUrl(music.fileInfo) : null
        setcurrentPlaying(music)
    }

    //向后切换
    function onClickBackward() {
        let musics = lovePlay ? musicList.filter(v => v.love) : [...musicList]
        let music: MusicInfo
        if (musics.length < 1) return
        if (randomPlay) {
            music = musics[random(0, musics.length - 1)]
        } else {
            let index = musics.findIndex(v => v.id === currentPlaying.id)
            if (index > -1) {
                music = musics[index > 0 ? index - 1 : musics.length - 1]
            } else {
                index = musics.findIndex(v => v.id < currentPlaying.id)
                music = musics[index > -1 ? index : 0]
            }
        }
        music = DeepCopy(music)
        !music.fileInfo.url ? music.fileInfo.url = ThroughFileInfoGetFileUrl(music.fileInfo) : null
        setcurrentPlaying(music)
    }

    //向前切换
    function onClickForward() {
        let musics = lovePlay ? musicList.filter(v => v.love) : [...musicList]
        let music: MusicInfo
        if (musics.length < 1) return
        if (randomPlay) {
            music = musics[random(0, musics.length - 1)]
        } else {
            let index = musics.findIndex(v => v.id === currentPlaying.id)
            if (index > -1) {
                music = musics[index === (musics.length - 1) ? 0 : index + 1]
            } else {
                index = musics.findIndex(v => v.id > currentPlaying.id)
                music = musics[index > -1 ? index : 0]
            }
        }
        music = DeepCopy(music)
        !music.fileInfo.url ? music.fileInfo.url = ThroughFileInfoGetFileUrl(music.fileInfo) : null
        setcurrentPlaying(music)
    }

    //播放速度调节
    function governingSpeed(type: '+' | '-') {
        let rate = audio.current.playbackRate
        if (type === '+') {
            rate = rate + 0.1 >= 2 ? 2 : rate + 0.1
        } else {
            rate = rate - 0.1 <= 0.1 ? 0.1 : rate - 0.1
        }
        audio.current.playbackRate = rate
        setspeed(round(audio.current.playbackRate, 1))
    }

    //鼠标滚轮调节播放速度
    function onWheelGoverningSpeed(e: React.WheelEvent<HTMLElement>) {
        governingSpeed(e.deltaY < 0 ? '+' : '-')
    }

    //音量调节
    function governingVolume(e: React.WheelEvent<HTMLElement>) {
        let volume = audio.current.volume
        if (e.deltaY < 0) {
            volume = volume + 0.02 >= 1 ? 1 : volume + 0.02
        } else {
            volume = volume - 0.02 <= 0 ? 0 : volume - 0.02
        }
        audio.current.volume = volume
        setvolume(volume)
    }

    //调节进度
    function onClickProgressBar(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (!currentPlaying) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.x
        audio.current.currentTime = audio.current.duration * x / rect.width
        setprogress(x / rect.width * 100)
    }

    //定位进度方便调节
    function onMouseMoveProgress(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (!currentPlaying) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.x
        setprogress2(x / rect.width * 100)
        const time = x / rect.width * audio.current.duration
        setmark(`${parseInt(time / 60)} : ${parseInt(time % 60)}`)
    }

    //结束定位进度
    function onMouseOutProgress() {
        setprogress2(0)
        setmark(null)
    }

    //播放
    function play() {
        audio.current.play()
        setisPlay(true)
    }

    //暂停
    function pause() {
        audio.current.pause()
        setisPlay(false)
    }

    //播放或暂停切换
    function onClickPlayPause() {
        if (!currentPlaying) return
        audio.current.paused ? play() : pause()
    }

    //移除歌曲
    function onClickRemoveMusic(index: number) {
        let newMusicList = [...musicList]
        newMusicList.splice(index, 1)
        setmusicList(newMusicList)
    }

    //添加歌曲
    function addMusic(files: FileList) {
        let musicFiles: File[] = []
        Array.from(files).forEach(v => {
            GetFileType(v) == MsgType.music ? musicFiles.push(v) : null
        })
        const index = musicList.length
        const musics = musicFiles.map((v, i) => ({ id: i + index, name: v.name.split('.')[0], fileInfo: { path: v.path, name: v.name, type: v.type }, timeLength: '0:0', love: false } as MusicInfo))
        setmusicList(musicList.concat(musics))
    }

    //歌曲就绪事件
    function onCanPlay() {
        setduration(`${parseInt(audio.current.duration / 60)} : ${parseInt(audio.current.duration % 60)} `)
        settimer(`${parseInt(audio.current.currentTime / 60)} : ${parseInt(audio.current.currentTime % 60)} `)
        //更新歌曲时长
        if (currentPlaying.timeLength === '0:0') {
            let newMusicList = [...musicList]
            newMusicList.some(v => {
                if (v.id === currentPlaying.id) v.timeLength = `${parseInt(audio.current.duration / 60)} : ${parseInt(audio.current.duration % 60)} `
                return v.id === currentPlaying.id
            })
            setmusicList(newMusicList)
        }
        setprogress(audio.current.currentTime / audio.current.duration * 100)
        setvolume(audio.current.volume)
        isPlay ? play() : null
    }

    //播放的进度更新事件(播放过程中不断调用)
    function onTimeUpdate() {
        let beforeTime = Date.now()
        return () => {
            let currentTime = Date.now()
            if (currentTime - beforeTime >= 999) {
                beforeTime = currentTime
                settimer(`${parseInt(audio.current.currentTime / 60)} : ${parseInt(audio.current.currentTime % 60)} `)
                setprogress(audio.current.currentTime / audio.current.duration * 100)
            }
        }
    }

    //歌曲结束事件
    function onEnded() {
        audio.current.currentTime = 0
        if (repeatPlay) {
            play()
        } else {
            let musics = lovePlay ? musicList.filter(v => v.love) : [...musicList]
            if (musics.length > 0) {
                let music: MusicInfo
                if (randomPlay) {
                    music = musics[random(0, musics.length - 1)]
                } else {
                    const index = musics.findIndex(v => v.id > currentPlaying.id)
                    music = index > -1 ? musics[index] : musics[0]
                }
                music = DeepCopy(music)
                !music.fileInfo.url ? music.fileInfo.url = ThroughFileInfoGetFileUrl(music.fileInfo) : null
                setcurrentPlaying(music)
            } else {
                setisPlay(false)
                setprogress(0)
            }
        }
    }

    useEffect(() => {
        if (!openWindow) {
            const { musicList, targetMusic } = readMusicList()
            setmusicList(musicList)
            setcurrentPlaying(targetMusic)
            openWindow = true
        }
    }, [])

    return (
        <article className="screen">
            <input type="checkbox" value="None" id="magicButton" name="check" />
            <label className="main" htmlFor="magicButton">
                <i className="fa fa-navicon" />
            </label>

            <div className="coverImage"></div>
            <div className="close-" onClick={() => { closeModal() }}><i className="fa fa-remove" /></div>
            <div className="minimize" onClick={MinWindow}><i className="fa fa-minus" /></div>


            <div className="bodyPlayer">
                <Tooltip placement='left' title='添加音乐'>
                    <div className='add-music'>
                        <i className="fa fa-plus" />
                        <input onChange={v => { addMusic(v.target.files) }} className='input-add-music' type="file" multiple={true} title=' ' />
                    </div>
                </Tooltip>
                <div className="list">
                    {
                        musicList.map((v, i) => (
                            <MyPopover menuContent={
                                <div className='popover-menu'>
                                    <div className='menu-remove-but' onClick={() => { onClickRemoveMusic(i) }}>移除</div>
                                </div>
                            } key={i + v.name}>
                                <table >
                                    <tbody>
                                        <tr className="song" onClick={() => { switchMusic(i) }}>
                                            <td className="nr"><h5>{i + 1}</h5></td>
                                            <td className="title"><h6 style={currentPlaying?.name === v.name ? { color: '#ff564c' } : {}}>{v.name}</h6></td>
                                            <td className="length"><h5>{v.timeLength === '0:0' ? '未知' : v.timeLength}</h5></td>
                                            <td className='love'><i className={`fa fa-heart${v.love ? '' : '-o'} `} onClick={(e) => { setToLoveMusic(v.id); e.stopPropagation() }} style={{ color: v.love ? '#ff564c' : '#6d6d6d' }} /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </MyPopover>
                        ))
                    }
                    <table>
                        <tbody>
                            <tr className="song"></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="shadow"></div>

            <div className="info">
                <h4>{currentPlaying?.name}</h4>
                {/* <h3></h3> */}
            </div>

            <audio src={currentPlaying?.fileInfo.url} ref={audio} onCanPlay={onCanPlay} onTimeUpdate={closureFunc['onTimeUpdate']} onEnded={onEnded} />
            <div className='music-position-progress-value' style={{ display: mark ? 'inline-flex' : 'none' }}>{mark}</div>
            <div className='music-progress-bar' onClick={onClickProgressBar} onMouseMove={onMouseMoveProgress} onMouseOut={onMouseOutProgress}>
                <div className='timer'>{timer}</div>
                <div className='duration'>{duration}</div>
                <div className='progress2' style={{ width: `${progress2}% ` }}></div>
                <div className='progress' style={{ width: `${progress}% ` }}></div>
            </div>

            <table className="player">
                <tbody>
                    <tr>
                        <td><i onClick={onClickBackward} className="fa fa-backward" /></td>
                        <td><i onClick={onClickPlayPause} className={`fa fa-${!isPlay ? 'play' : 'pause'} `} /></td>
                        <td><i onClick={onClickForward} className="fa fa-forward" /></td>
                        <td>
                            <Tooltip placement='top' title={`滚动调节 ${round(volume * 100)}%`}>
                                <i onWheel={governingVolume} className={`fa fa-volume-${volume <= 0 ? 'off' : (volume <= 0.5 ? 'down' : 'up')} `}  />
                            </Tooltip>
                        </td>
                        <td
                            onWheel={onWheelGoverningSpeed}
                            style={{ fontSize: '13px', fontWeight: 'bold' }}>
                            <Tooltip placement='top' title={speed == 1 ? '正常' : `${speed}x`}>倍速</Tooltip>
                        </td>
                    </tr>
                </tbody>
            </table>

            <table className="footer">
                <tbody>
                    <tr>
                        <td><i className={`fa fa-heart${lovePlay ? '' : '-o'} `} onClick={() => { setlovePlay(!lovePlay) }} style={{ color: lovePlay ? '#ff564c' : '#6d6d6d' }} /></td>
                        <td><i className="fa fa-random" onClick={() => { setrandomPlay(!randomPlay) }} style={{ color: randomPlay ? '#ff564c' : '#6d6d6d' }} /></td>
                        <td><i className="fa fa-repeat" onClick={() => { setrepeatPlay(!repeatPlay) }} style={{ color: repeatPlay ? '#ff564c' : '#6d6d6d', display: 'flex', flexDirection: 'row', justifyContent: 'center' }}><div style={{ fontSize: '10px' }}>1</div></i></td>
                    </tr>
                </tbody>
            </table>

            <div className="current"><h2>{currentPlaying?.name}</h2></div>

        </article>
    );
}

(ReactDom.render || ReactDom.hydrate)(<Modal />, document.getElementById('root'))