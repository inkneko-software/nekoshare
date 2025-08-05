import StockDayPrice from "./StockDayPrice";


export type ModelAResult = {
    open_high_percent: number;
    fit_open_high: boolean;
    float_ratio_7days: number;
    fit_float_ratio_7days: boolean;
    float_ratio_15days: number;
    fit_float_ratio_15days: boolean;
    float_ratio_30days: number;
    fit_float_ratio_30days: boolean;
    meaning_close_180days: number;
    meaning_difference_ratio_180days: number;
    higher_than_today_open_90days: number;
    fit_higher_than_today_open_90days: boolean;
    higher_than_today_open_180days: number;
    fit_higher_than_today_open_180days: boolean;
    higher_than_today_open_270days: number;
    fit_higher_than_today_open_270days: boolean;

};


export default function modelAOptimized(data: StockDayPrice[], todayOpen: number): ModelAResult {
    const ret: ModelAResult = {
        open_high_percent: 0,
        fit_open_high: false,
        float_ratio_7days: 0,
        fit_float_ratio_7days: false,
        float_ratio_15days: 0,
        fit_float_ratio_15days: false,
        float_ratio_30days: 0,
        fit_float_ratio_30days: false,
        meaning_close_180days: 0,
        meaning_difference_ratio_180days: 0,
        higher_than_today_open_90days: 0,
        fit_higher_than_today_open_90days: false,
        higher_than_today_open_180days: 0,
        fit_higher_than_today_open_180days: false,
        higher_than_today_open_270days: 0,
        fit_higher_than_today_open_270days: false,
    };

    const lastClose = data[data.length - 1]?.close;
    if (lastClose === undefined) return ret;

    const openHighPercent = ((todayOpen - lastClose) / lastClose) * 100;
    ret.open_high_percent = openHighPercent;

    if (openHighPercent >= 2 && openHighPercent <= 5) {
        ret.fit_open_high = true;
    } else {
        return ret;
    }

    const sliceFromEnd = (arr: StockDayPrice[], n: number) => arr.slice(Math.max(arr.length - n, 0));

    const getHigh = (arr: StockDayPrice[]) => Math.max(...arr.map(d => d.high));
    const getLow = (arr: StockDayPrice[]) => Math.min(...arr.map(d => d.low));
    const getCloseMean = (arr: StockDayPrice[]) =>
        arr.reduce((sum, d) => sum + d.close, 0) / (arr.length || 1);

    const floatRatio = (arr: StockDayPrice[], n: number) => {
        const subset = sliceFromEnd(arr, n);
        const high = getHigh(subset);
        const low = getLow(subset);
        return ((high / low) - 1) * 100;
    };

    // 7日波动率
    const float7 = floatRatio(data, 7);
    ret.float_ratio_7days = float7;
    if (float7 <= 10) ret.fit_float_ratio_7days = true;

    // 15日波动率
    const float15 = floatRatio(data, 15);
    ret.float_ratio_15days = float15;
    if (float15 <= 10) ret.fit_float_ratio_15days = true;

    // 30日波动率
    const float30 = floatRatio(data, 30);
    ret.float_ratio_30days = float30;
    if (float30 <= 12) ret.fit_float_ratio_30days = true;

    // 90日平均收盘价
    const data180 = sliceFromEnd(data, 180);
    const meanClose180 = getCloseMean(data180);
    ret.meaning_close_180days = meanClose180;

    // 与开盘价比较差值
    ret.meaning_difference_ratio_180days = ((todayOpen - meanClose180) / meanClose180) * 100;

    // 90日高于开盘价的数量
    const data90 = sliceFromEnd(data, 90);
    const higher90 = data90.filter(d => d.high > todayOpen).length;
    ret.higher_than_today_open_90days = higher90;
    if (higher90 < 5) ret.fit_higher_than_today_open_90days = true;

    // 180日高于开盘价的数量
    const higher180 = data180.filter(d => d.high > todayOpen).length;
    ret.higher_than_today_open_180days = higher180;
    if (higher180 < 10) ret.fit_higher_than_today_open_180days = true;

    // 270日高于开盘价的数量
    const data270 = sliceFromEnd(data, 270);
    const higher270 = data270.filter(d => d.high > todayOpen).length;
    ret.higher_than_today_open_270days = higher270;
    if (higher270 < 15) ret.fit_higher_than_today_open_270days = true;

    return ret;
}
