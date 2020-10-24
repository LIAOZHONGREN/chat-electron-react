import { Dispatch } from 'redux'
import {
    INIT_USER,
    UPDATE_USER,
    PUSH_NEWFRIEND,
    PUSH_FRIEND,
    UPDATE_NEWFRIEND,
    UPDATE_CHATS,
    REMOVE_NEWFRIEND,
    TEST,
    PUSH_CHAT,
    SET_CURRENT_CHAT,
    PUSH_GROUPCHAT,
    REMOVE_CHAT,
    RESET_STARE,
    SET_HAVE_READ,
    GROUPCHAT_ADD_MEMBER,
    SET_GROUPCHAT_NAME,
    REMOVE_GROUPCHAT,
    GROUPCHAT_REMOVE_MEMBER,
    ADD_NO_PROMPT_LIST,
    POP_NO_PROMPT_LIST,
    REMOVE_FRIEND, UPDATE_WITHDRAWN_THE_MSG, REMOVE_MSG, UPDATE_CHAT_MSG, INIT_STATE, SET_CHAT
} from './actionTypes'
import { User, NewFriend, FriendState, Chat, GroupChat, MsgState } from '../net/model'
import store from './index'
import { ChatData } from '../net/net'
import { StateType } from './reducer'

export type DispatchFunc = (dispatch: Dispatch) => void

export function ResetState(): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: RESET_STARE, value: '' })
    }
}

export function InitState(state: StateType): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: INIT_STATE, value: state })
    }
}

export function InitUser(user: User): DispatchFunc {
    return (dispatch: Dispatch) => {
        dispatch({ type: INIT_USER, value: user })
    }
}

export function UpdataUser(user: User): DispatchFunc {
    return (dispatch: Dispatch) => {
        let user_ = { ...store.getState().user }
        user.name !== undefined ? user_.name = user.name : null
        user.password !== undefined ? user_.password = user.password : null
        user.identity !== undefined ? user_.identity = user.identity : null
        user.gender !== undefined ? user_.gender = user.gender : null
        user.area !== undefined ? user_.area = user.area : null
        user.headImg !== undefined ? user_.headImg = user.headImg : null
        dispatch({ type: UPDATE_USER, value: user_ })
    }
}

export function PushNewFriend(newFriend: NewFriend): DispatchFunc {
    return (dispatch: Dispatch) => {
        dispatch({ type: PUSH_NEWFRIEND, value: newFriend })
    }
}

export function PushFriend(friend: User): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: PUSH_FRIEND, value: friend })
    }
}

export function RemoveFriend(friend: User, passive: boolean): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: REMOVE_FRIEND, value: { friend: friend, passive: passive } })
    }
}

export function PushChat(chat: Chat): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: PUSH_CHAT, value: chat })
    }
}

export function SetChat(chat: Chat): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: SET_CHAT, value: chat })
    }
}

export function RemoveChat(chat: Chat): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: REMOVE_CHAT, value: chat })
    }
}

export function UpdateChats(chat: Chat): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: UPDATE_CHATS, value: chat })
    }
}

export function UpdateChatMsg(value: { chatId: string, msgId: string, progress?: number, msg?: any, state?: MsgState }): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: UPDATE_CHAT_MSG, value: value })
    }
}

export function RemoveNewFriend(newFriend: NewFriend): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: REMOVE_NEWFRIEND, value: newFriend })
    }
}

export function SetCurrentChat(chat: chat | null): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: SET_CURRENT_CHAT, value: chat })
    }
}

export function TestCreator(test: any): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: TEST, value: test })
    }
}

export function PushGroupChat(groupChat: GroupChat): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: PUSH_GROUPCHAT, value: groupChat })
    }
}

export function AddMemberToGroupChat(groupChat: GroupChat, member: User[]): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: GROUPCHAT_ADD_MEMBER, value: { groupChat: groupChat, member: member } })
    }
}

export function SetGroupChatName(groupChat: GroupChat, name: string): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: SET_GROUPCHAT_NAME, value: { groupChat: groupChat, name: name } })
    }
}

export function RemoveGroupChat(gc: GroupChat, passive: boolean): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: REMOVE_GROUPCHAT, value: { groupChat: gc, passive: passive } })
    }
}

export function RemoveMemberFromGroupChat(gu: { groupChat: GroupChat, user: User }): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: GROUPCHAT_REMOVE_MEMBER, value: gu })
    }
}

export function SetHaveRead(id: string, type: 'chat-news' | 'newFriend-news'): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: SET_HAVE_READ, value: { id: id, type: type } })
    }
}

export function AddNoPromptList(id: string): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: ADD_NO_PROMPT_LIST, value: id })
    }
}

export function PopNoPromptList(id: string): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: POP_NO_PROMPT_LIST, value: id })
    }
}

//更新撤回的消息,没有什么实际作用,只是用于通过更新来刷新界面(通过刷新界面来取消文字信息的撤回后的重新编辑功能,因为重新编辑设置了时效)
export function UpdateWithdrawnTheMsg(value: { chatId: string, msgId: string }): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: UPDATE_WITHDRAWN_THE_MSG, value: value })
    }
}

export function RemoveMsg(value: { chatId: string, msgId: string }): DispatchFunc {
    return (d: Dispatch) => {
        d({ type: REMOVE_MSG, value: value })
    }
}
