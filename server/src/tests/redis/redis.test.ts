import { Client, SetAsync, GetAsync, DelAsync, ZaddAsyac, ZrangeAsync, ZrevRangeAsync, ZremRangeByScoreAsync, ExistsAsync, ZrangeBySoreAsync, ZrevRangeByScoreAsync, HsetAsync, HgetAsync, HdelAsync } from '../../common/redis'

afterAll(async () => {
    //Client.flushdb()
});

describe('测试redis', () => {

    const key = 'set-async'

    test('SetAsync', async () => {
        const bool = await SetAsync(key, key)
        expect(bool).toBe(true)
    })

    test('GetAsync', async () => {
        const value = await GetAsync(key)
        expect(value).toBe(key)
    })

    test('DelAsync', async () => {
        const num = await DelAsync(key)
        expect(num).toBe(1)
    })

    test('ZaddAsyac_ZrangeAsync_ZrevRangeAsync', async () => {
        await ZaddAsyac(key, 0, '0')
        await ZaddAsyac(key, 1, '1')
        await ZaddAsyac(key, 2, '2')
        const arr = await ZrangeAsync(key, 0, 2)
        const arr2 = await ZrevRangeAsync(key, 0, 2)
        expect(arr.concat(arr2)).toStrictEqual(['0', '1', '2', '2', '1', '0'])
    })

    test('ExistsAsync_存在', async () => {
        const num = await ExistsAsync(key)
        expect(num).toBe(1)
    })

    test('ZremRangeByScoreAsync', async () => {
        const num = await ZremRangeByScoreAsync(key, 0, 2)
        expect(num).toBe(3)
    })

    test('ExistsAsync_不存在', async () => {
        const num = await ExistsAsync(key)
        expect(num).toBe(0)
    })

    test('ZrangeBySoreAsync_ZrevRangeByScoreAsync', async () => {
        const [s0, s1, s2] = [Date.now(), Date.now() + 1, Date.now() + 2]
        await ZaddAsyac(key, s0, '0')
        await ZaddAsyac(key, s0, '1')
        await ZaddAsyac(key, s0, '2')
        const val0 = await ZrangeBySoreAsync(key, 0, Date.now())
        const val1 = await ZrevRangeByScoreAsync(key, Date.now(), 0)
        await DelAsync(key)
        expect(val0.concat(val1)).toStrictEqual(['0', '1', '2', '2', '1', '0'])
    })

    test('HsetAsync_HgetAsync', async () => {

        const n = await HsetAsync(key, 'value', 'value')
        const value = await HgetAsync(key, 'value')
        expect([n, value]).toStrictEqual([1, 'value'])
    })

    test('HdelAsync', async () => {
        const n = await HdelAsync(key, 'value')
        await DelAsync(key)
        expect(n).toBe(1)
    })

})

//yarn test D:/viewStudy/chat-electron-react/server/src/tests/redis/redis.test.ts