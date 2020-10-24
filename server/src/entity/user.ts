import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { MyFriend } from './myFriend';
import { GroupChat } from './groupChat'

export enum GenderEnum {
    unisex,
    girl,
    boy
}

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string
    @Column()
    identity: string
    @Column()
    name: string
    @Column({ select: false })
    password: string
    @Column({ type: 'enum', enum: GenderEnum, default: GenderEnum.unisex })
    gender: GenderEnum
    @Column({ nullable: true })
    area: string
    @Column({ type: 'longtext', nullable: true })
    headImg: string
}

export interface IUser {
    id?: string
    identity?: string
    name?: string
    password?: string
    gender?: GenderEnum
    area?: string
    headImg?: string
}