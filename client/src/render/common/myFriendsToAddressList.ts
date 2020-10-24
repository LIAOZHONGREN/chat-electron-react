import { User, MyFriends } from '../net/model'
import mtils from 'mtils'
import { SortUserArray, LetterArr } from './sort'


export function MyFriendsToAddressList(myFriends: MyFriends): ({ [initials: string]: User[] }) {
    let addressList: { [initials: string]: User[] } = {}
    for (let user of myFriends.users) {
        const py = (mtils.utils.makePy(user.name, false) as string).toUpperCase()
        let i = LetterArr.indexOf(py.charAt(0))
        i = i === -1 ? 26 : i
        addressList[LetterArr[i]] ? addressList[LetterArr[i]].push(user) : addressList[LetterArr[i]] = [user]
    }
    Object.keys(addressList).map((key, i, a) => {
        SortUserArray(addressList[key])
    })

    return addressList
}