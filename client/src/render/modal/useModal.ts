import React, { useEffect } from 'react'
import { ipcRenderer } from 'electron'
import { CloseWindow } from '../common/electronTool'
import { WindowCommunicationData, WindowCommunicationType } from '../net/model'

export function useModal(props: { onCloseModal?: () => void, onInitData?: (data: WindowCommunicationData) => void, onWindowCommunication?: (data: WindowCommunicationData) => void }): { closeModal: (responseData?: WindowCommunicationData) => void, sendData: (data?: WindowCommunicationData) => void } {

    const { onCloseModal, onInitData, onWindowCommunication } = props

    function closeModal(data?: any) {
        if (data) {
            const wcd: WindowCommunicationData = { type: WindowCommunicationType.end, data: data }
            ipcRenderer.send('end-modal-win', wcd)
        }
        if (onCloseModal) onCloseModal()
        ipcRenderer.removeAllListeners('trigger')
        ipcRenderer.removeAllListeners('window-communication')
        ipcRenderer.send('close-modal-win', { type: WindowCommunicationType.close } as WindowCommunicationData)
        CloseWindow()
    }

    function sendData(data: WindowCommunicationData) {
        ipcRenderer.send('window-communication', data)
    }

    useEffect(() => {

        ipcRenderer.on('trigger', (ev, arg) => {
            ipcRenderer.send('window-communication', { type: WindowCommunicationType.start } as WindowCommunicationData)
        })

        ipcRenderer.on('window-communication', async (ev, data) => {
            const wcd: WindowCommunicationData = data

            if (wcd.type == WindowCommunicationType.start) {
                if (onInitData) onInitData(wcd)
                return
            }

            if (onWindowCommunication) onWindowCommunication(wcd)
        })
        
        ipcRenderer.send('window-communication', { type: WindowCommunicationType.start } as WindowCommunicationData)
        return () => { }
    }, [])

    return { closeModal: closeModal, sendData: sendData }
}