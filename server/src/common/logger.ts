import { configure, getLogger } from "log4js";

configure({
    appenders: {
        'out': { type: 'stdout', layout: { type: 'colored' } },
        'app': {
            type: 'file', filename: './logs/application.log', maxLogSize: 10485760, backups: 3, compress: true,
            layout: { type: 'pattern', pattern: '[%d{yyyy/MM/dd:hh.mm.ss}] %p %c %f %l %o - %m%n' }
        }
    },
    categories: { default: { appenders: ['out'], level: 'info' } }
})
const logger = getLogger();
logger.info('logger:我来啦!');

export default logger