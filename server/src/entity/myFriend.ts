
import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn } from 'typeorm'
import { User, IUser } from './user'

@Entity()
export class MyFriend {
    @PrimaryColumn({ select: false })
    myId: string
    @PrimaryColumn({ select: false })
    friendId: string
}

export interface IMyFriends {
    users?: IUser[]
}