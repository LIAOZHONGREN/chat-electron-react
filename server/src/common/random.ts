
export function Random(length: number): number {
    let result, tmp = null
    let flag = true;
    if (length) {
        while (flag) {
            tmp = Math.random();
            if (tmp > 0.1) {
                result = Math.floor(tmp * Math.pow(10, length));
                flag = false;
                return result;
            }
        }
    } else {
        while (flag) {
            tmp = Math.random();
            if (tmp > 0.1) {
                result = Math.floor(tmp * Math.pow(10, 5));
                flag = false;
                return result;
            }
        }
    }
    return 0
}
