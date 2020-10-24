
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, PrimaryColumn } from 'typeorm'
import { User, IUser } from './user'

@Entity()
export class GroupChat {
    @PrimaryGeneratedColumn('uuid')
    id: string
    @Column()
    name: string
    @Column()
    creatorId: string
}

@Entity()
export class GroupChatMember {
    @PrimaryColumn()
    groupChatId: string
    @PrimaryColumn()
    userId: string
}

export interface IGroupChat {
    id?: string
    name?: string
    creator?: IUser
    users?: { [id: string]: IUser }
}