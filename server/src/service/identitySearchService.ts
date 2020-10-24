import { Context } from 'koa'
import { getConnection } from 'typeorm'
import { User, IUser } from '../entity/user'
import { ResponseData } from '../type'
import logger from '../common/logger'

export async function IdentitySearchService(ctx: Context) {
    const value = ctx.request.body.value
    try {
        const users = await getConnection().createQueryBuilder().select(['u.id as id', 'u.identity as identity', 'u.name as name', 'u.gender as gender', 'u.area as area', 'u.headImg as headImg']).from(User, 'u').where('u.identity=:identity', { identity: value }).execute()
        ctx.body = users ? { data: users } as ResponseData : {}
    } catch (error) {
        logger.error('IdentitySearchService:', error)
        ctx.status = 500
        ctx.body = {}
    }
}