import dayjs, { Dayjs } from "dayjs";
import { holidays } from './constants'


/**
 * 判断是否是交易日（非周末 + 非节假日）
 */
export function isTradingDay(d: Dayjs): boolean {
    const weekday = d.day();  // 0=周日, 6=周六

    if (weekday === 0 || weekday === 6) {
        return false;
    }

    if (holidays.has(d.format("YYYY-MM-DD"))) {
        return false;
    }

    return true;
}

/**
 * 获取最新交易日：
 * - 如果今天是交易日但时间 < 09:15，则退回上一交易日
 * - 否则回退到最近的交易日
 */
export function getLatestTradingDay(now: Dayjs | null = null): Dayjs {
    if (!now) {
        now = dayjs();
    }

    let today = now.startOf("day");

    // 今天是交易日但当前时间在 9:15 之前
    const cutoff = dayjs(today.format("YYYY-MM-DD") + " 09:15");
    if (isTradingDay(today) && now.isBefore(cutoff)) {
        today = today.subtract(1, "day");
    }

    // 回退到最近交易日
    while (!isTradingDay(today)) {
        today = today.subtract(1, "day");
    }

    return today;
}

/**
 * 获取下一个交易日
 */
export function getNextTradingDay(current: Dayjs): Dayjs {
    let d = current.add(1, "day");

    while (!isTradingDay(d)) {
        d = d.add(1, "day");
    }

    return d;
}

/**
 * 获取上一个交易日
 */
export function getPrevTradingDay(current: Dayjs): Dayjs {
    let d = current.subtract(1, "day");

    while (!isTradingDay(d)) {
        d = d.subtract(1, "day");
    }

    return d;
}
