import moment from "moment"

/*
 *  1616445764 (unix timestamp secs) => return "2021/3/23"
 */
export function getDate(ts: number) {
    const date = new Date(ts * 1000)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

export function timezoneStr() {
    return moment.unix(0).format("ZZ")
}

export function normalizeToUnixtime(time: number) {
    // Temporary processing until changing the timestamp of subquery to unix timestamp
    if (time > 4000000000) {
        time = time / 1000
    }
    return time
}

export function formatTime(unixtime: number, withoutTimezone: boolean = false) {
    unixtime = normalizeToUnixtime(unixtime)
    if (withoutTimezone) {
        return moment.unix(unixtime).format("YYYY/MM/DD HH:mm:ss")
    } else {
        return moment.unix(unixtime).format()
    }
}

export function getDuration(t: number) {
    // secs
    if (t <= 0) {
        return [0, 0, 0, 0]
    }
    const ret = [60, 60, 24].reduce(
        (acc, unit, idx) => {
            const next = Math.floor(acc[0] / unit)
            const mod = acc[0] % unit
            const ret = [mod, ...acc.slice(1)]
            const newAcc = [next, ...ret]
            return newAcc
        },
        [t],
    )
    // add up to 4-digits array if needed
    return Array.from({ length: 4 - ret.length }, () => 0).concat(ret)
}

export function getTimestampBySubtractDays(days: number) {
    return days === -1 ? 1600000000 : moment().subtract(days, "d").unix()
}
