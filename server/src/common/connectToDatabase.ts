import { createConnection, Connection } from 'typeorm'
import logger from './logger'

//此数据库连接 用于测试
export async function ConnectToDatabase() {
    await createConnection().then(connection => {
        logger.info('我连上数据库了!')
    }).catch(err => logger.error(err))
}