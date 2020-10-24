import { User } from "../net/model";
import mtils from 'mtils'

export const LetterArr = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#']

export function SortUserArray(users: User[]) {
    users.sort((a, b) => {
        const [a_name, b_name] = [(mtils.utils.makePy(a.name, false) as string).toUpperCase(), (mtils.utils.makePy(b.name, false) as string).toUpperCase()]
        const num = a_name.length > b_name.length ? b_name.length : a_name.length
        for (let i = 0; i < num; i++) {
            let [a_index, b_index] = [LetterArr.indexOf(a_name.charAt(i)), LetterArr.indexOf(b_name.charAt(i))]
            a_index = a_index === -1 ? 26 : a_index
            b_index = b_index === -1 ? 26 : b_index
            if (a_index !== b_index) return a_index - b_index
        }
        return 0
    })
}
