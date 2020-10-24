import Router from 'koa-router'
import {
    RegisterUrl,
    LoginUrl,
    GetVerificationCodeUrl,
    VerificationCodeUrl,
    IdentitySearchUrl,
    GetChatFriendsUrl,
    GetGroupChatsUrl,
    CreateGroupChatUrl,
    SetHeadImgUrl,
    GroupChatAddMemberUrl,
    SetGroupChatNameUrl,
    ExitGroupChatUrl,
    AddFriendUrl,
    DeleteFriendUrl, SearchGroupChatUrl, JoinGroupChatUrl, UploadfileUrl
} from './url'
import { LoginService, RegisterService } from '../service/loginAndRegister'
import { SendVerificationCodeToMailerService, VerificationCodeIsPassService } from '../service/verificationCodeService'
import { IdentitySearchService } from '../service/identitySearchService'
import { GetChatFriendsService } from '../service/getChatFriendsService'
import { GetGroupChatsService } from '../service/getGroupChatsService'
import { CreateGroupChatService } from '../service/createGroupChatService'
import { SetHeadImgService } from '../service/setHeadImgService'
import { GroupChatAddMemberService } from '../service/groupChatAddMemberService'
import { SetGroupChatNameService } from '../service/setGroupChatNameService'
import { ExitGroupChatService } from '../service/ExitGroupChatService'
import { AddFriendService, DeleteFriendService } from '../service/addFriendAndDeleteFriend'
import { SearchGroupChatService } from '../service/searchGroupChatService'
import { JoinGroupChatService } from '../service/joinGroupChatService'
import { ReceiveFileService } from '../service/receiveFileService'

const router = new Router()

router.post(RegisterUrl, RegisterService)
router.post(LoginUrl, LoginService)
router.post(GetVerificationCodeUrl, SendVerificationCodeToMailerService)
router.post(VerificationCodeUrl, VerificationCodeIsPassService)
router.post(IdentitySearchUrl, IdentitySearchService)
router.post(AddFriendUrl, AddFriendService)
router.post(DeleteFriendUrl, DeleteFriendService)
router.post(GetChatFriendsUrl, GetChatFriendsService)
router.post(GetGroupChatsUrl, GetGroupChatsService)
router.post(CreateGroupChatUrl, CreateGroupChatService)
router.post(SetHeadImgUrl, SetHeadImgService)
router.post(GroupChatAddMemberUrl, GroupChatAddMemberService)
router.post(SetGroupChatNameUrl, SetGroupChatNameService)
router.post(ExitGroupChatUrl, ExitGroupChatService)
router.post(SearchGroupChatUrl, SearchGroupChatService)
router.post(JoinGroupChatUrl, JoinGroupChatService)
router.post(UploadfileUrl, ReceiveFileService)


export default router