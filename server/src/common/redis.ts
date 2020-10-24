
import redis from 'redis'
import logger from '../common/logger'

const client = redis.createClient()

export function ExistsAsync(key: string | string[]): Promise<number> {
    return new Promise((resolve, reject) => {
        client.exists(key, (err, reply) => {
            if (err) {
                logger.error('redis的ExistsAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function ExpireAsync(key: string, seconds: number): Promise<number> {
    return new Promise((resolve, reject) => {
        client.expire(key, seconds, (err, reply) => {
            if (err) {
                logger.error('redis的ExpireAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function SetAsync(key: string, value: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        client.set(key, value, (err, reply) => {
            if (err) {
                logger.error('redis的SetAsync发生错误:', err)
                reject(err)
            }
            resolve(reply === "OK")
        })
    })
}

export function GetAsync(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
        client.get(key, (err, reply) => {
            if (err) {
                logger.error('redis的GetAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function DelAsync(arg1: string | string[]): Promise<number> {
    return new Promise((resolve, reject) => {
        client.del(arg1, (err, reply) => {
            if (err) {
                logger.error('redis的DelAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function ZaddAsyac(key: string, score: number, value: string): Promise<number> {
    return new Promise((resolve, reject) => {
        client.zadd(key, score, value, (err, reply) => {
            if (err) {
                logger.error('redis的ZaddAsyac发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function ZrangeAsync(key: string, start: number, stop: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
        client.zrange(key, start, stop, (err, reply) => {
            if (err) {
                logger.error('redis的ZrangeAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function ZrevRangeAsync(key: string, start: number, stop: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
        client.zrevrange(key, start, stop, (err, reply) => {
            if (err) {
                logger.error('redis的ZrevRangeAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function ZrangeBySoreAsync(key: string, start: string | number, stop: string | number): Promise<string[]> {
    return new Promise((resolve, reject) => {
        client.zrangebyscore(key, start, stop, (err, reply) => {
            if (err) {
                logger.error('redis的ZrangeBySoreAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function ZrevRangeByScoreAsync(key: string, start: string | number, stop: string | number): Promise<string[]> {
    return new Promise((resolve, reject) => {
        client.zrevrangebyscore(key, start, stop, (err, reply) => {
            if (err) {
                logger.error('redis的ZrevRangeByScoreAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function ZremRangeByScoreAsync(key: string, start: string | number, stop: string | number): Promise<number> {
    return new Promise((resolve, reject) => {
        client.zremrangebyscore(key, start, stop, (err, reply) => {
            if (err) {
                logger.error('redis的ZremRangeByScoreAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function HsetAsync(hashKey: string, subKey: string, value: string): Promise<number> {
    return new Promise((resolve, reject) => {
        client.hset(hashKey, subKey, value, (err, reply) => {
            if (err) {
                logger.error('redis的HsetAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function HgetAsync(hashKey: string, subKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
        client.hget(hashKey, subKey, (err, reply) => {
            if (err) {
                logger.error('redis的HgetAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

export function HdelAsync(hashKey: string, subKey: string | string[]): Promise<number> {
    return new Promise((resolve, reject) => {
        client.hdel(hashKey, subKey, (err, reply) => {
            if (err) {
                logger.error('redis的HdelAsync发生错误:', err)
                reject(err)
            }
            resolve(reply)
        })
    })
}

logger.info('redis:我来啦!')
export const Client = client