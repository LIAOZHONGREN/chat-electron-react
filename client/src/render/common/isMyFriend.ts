import { User } from "../net/model";
import store from '../redux/index'


export function IsMyFriend(user: User, addressList: { [initials: string]: User[] }): boolean {
    return Object.keys(addressList).some((v, i, a) => (addressList[v].findIndex(u => (u.id === user.id)) !== -1))

}