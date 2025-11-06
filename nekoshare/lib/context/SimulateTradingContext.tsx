'use client'
import { createContext, useContext, useEffect, useState } from "react";

// 持仓
export interface Position {
    // 股票代码
    code: string;
    // 股票名称
    name: string;
    // 持仓数量
    quantity: number;
    // 可用数量
    avilableQuantity: number;
    // 现价
    price: number;
    // 持仓盈亏
    profit: number;
    // 持仓盈亏比例
    profitRatio: number;
    // 持仓成本
    cost: number;
    // 持仓市值
    equity: number;
}

// 交易历史
export interface TradeHistory {
    // 交易时间
    tradeDate: string;
    // 股票代码
    code: string;
    // 股票名称
    name: string;
    // 交易价格
    price: number;
    // 交易数量
    quantity: number;
    // 交易金额
    amount: number;
    // 交易类型
    type: 'buy' | 'sell';
    // 清仓盈亏
    profit?: number;
    // 盈亏比例
    prifitRatio?: number;
}

// 账户
export interface Account {

    // 账户ID
    id: string;
    // 名称
    name: string;
    // 总资产
    balance: number;
    // 市值
    equity: number;
    // 可用余额
    available: number;
    // 持仓盈亏
    profit: number;
    // 当日盈亏
    profitToday: number;
    // 持仓
    positions: Position[];
    // 账户历史
    history: TradeHistory[];
}

const defaultAccount: Account = {
    id: '-1',
    name: '无效账户',
    balance: 0,
    equity: 0,
    available: 0,
    profit: 0,
    profitToday: 0,
    positions: [],
    history: []
};

export interface ISimulateTradingApi {
    account: Account;
    setAccount: (account: Account) => void;
    isEnabled: boolean;
    setEnabled: (enabled: boolean) => void;
    isPaused: boolean;
    setPaused: (paused: boolean) => void;
    startTradeDate: string;
    setStartTradeDate: (date: string) => void;
    currentTradeDate: string;
    setCurrentTradeDate: (date: string) => void;
    newSimulate: (trade_date: string, balance: number) => void;
    buy: (code: string, name: string, price: number, quantity: number) => void;
    sell: (code: string, name: string, price: number, quantity: number) => void;
    toNextTradeDate: () => void;
}
const SimulateTradingContext = createContext<ISimulateTradingApi>({
    account: defaultAccount,
    setAccount: () => { },
    isEnabled: false,
    setEnabled: () => { },
    isPaused: false,
    setPaused: () => { },
    startTradeDate: '2025-01-02',
    setStartTradeDate: () => { },
    currentTradeDate: '2025-01-02',
    setCurrentTradeDate: () => { },
    newSimulate: () => { },
    buy: () => { },
    sell: () => { },
    toNextTradeDate: () => { }
});


export function SimulateTradingContextProvider({ children }: { children: React.ReactNode }) {
    const [account, setAccount] = useState<Account>(defaultAccount);
    const [isEnabled, setEnabled] = useState<boolean>(false);
    const [isPaused, setPaused] = useState<boolean>(false);
    const [startTradeDate, setStartTradeDate] = useState<string>('2025-01-02');
    const [currentTradeDate, setCurrentTradeDate] = useState<string>('2025-01-02');
    useEffect(() => {
        const accountJson = localStorage.getItem('context/SimulateTradingContext::account');
        const isEnabledJson = localStorage.getItem('context/SimulateTradingContext::isEnabled');
        const isPausedJson = localStorage.getItem('context/SimulateTradingContext::isPaused');
        const startTradeDateJson = localStorage.getItem('context/SimulateTradingContext::startTradeDate');
        const currentTradeDateJson = localStorage.getItem('context/SimulateTradingContext::currentTradeDate');

        setAccount(accountJson ? JSON.parse(accountJson) : defaultAccount);
        setEnabled(isEnabledJson ? JSON.parse(isEnabledJson) : false);
        setPaused(isPausedJson ? JSON.parse(isPausedJson) : false);
        setStartTradeDate(startTradeDateJson ? JSON.parse(startTradeDateJson) : '2025-01-02');
        setCurrentTradeDate(currentTradeDateJson ? JSON.parse(currentTradeDateJson) : '2025-01-02');

    }, []);

    useEffect(() => {
        localStorage.setItem('context/SimulateTradingContext::account', JSON.stringify(account))
        localStorage.setItem('context/SimulateTradingContext::isEnabled', JSON.stringify(isEnabled))
        localStorage.setItem('context/SimulateTradingContext::isPaused', JSON.stringify(isPaused))
        localStorage.setItem('context/SimulateTradingContext::startTradeDate', JSON.stringify(startTradeDate))
        localStorage.setItem('context/SimulateTradingContext::currentTradeDate', JSON.stringify(currentTradeDate))
    }, [account, isEnabled, isPaused, startTradeDate, currentTradeDate]);

    const handleNewSimulate = (trade_date: string, balance: number) => {
        console.log(trade_date, balance)
        setAccount({
            id: '1',
            name: 'root',
            balance: balance,
            equity: 0,
            available: balance,
            profit: 0,
            profitToday: 0,
            positions: [],
            history: []
        });

        setStartTradeDate(trade_date);
        setCurrentTradeDate(trade_date);
    }

    const getTradeFee = (amount: number) => {
        return Math.max(amount * 0.00025, 5);
    }

    const handleBuy = (code: string, name: string, price: number, quantity: number) => {
        if (!isEnabled || isPaused) {
            throw new Error('模拟交易未启用');
        }

        const trade_fee = getTradeFee(price * quantity);

        if (account.available < price * quantity + trade_fee) {
            throw new Error('可用余额不足');
        }


        let found = false;
        setAccount(account => ({
            ...account,
            balance: account.balance - trade_fee,
            equity: account.equity + price * quantity,
            available: account.available - price * quantity - trade_fee,
            profit: account.profit - trade_fee,
            profitToday: account.profitToday - trade_fee,
            positions: account.positions.map(position => {

                if (position.code === code) {
                    // 持仓数量
                    let _quantity: number = position.quantity + quantity;
                    // 持仓市值
                    let _equity: number = position.equity + price * quantity;
                    // 持仓成本
                    let _cost: number = _equity / _quantity;
                    found = true;
                    return {
                        ...position,
                        quantity: _quantity,
                        equity: _equity,
                        profitRatio: position.profit / (_equity - position.profit) * 100,
                        cost: _cost
                    };
                }
                return position;
            }),
            history: [...account.history, {
                // 交易时间
                tradeDate: currentTradeDate,
                // 股票代码
                code: code,
                // 股票名称
                name: name,
                // 交易价格
                price: price,
                // 交易数量
                quantity: quantity,
                // 交易金额
                amount: price * quantity,
                // 交易类型
                type: 'buy'
            }]
        }));

        if (!found) {
            setAccount(account => ({
                ...account,
                positions: [
                    ...account.positions,
                    {
                        code: code,
                        name: name,
                        quantity: quantity,
                        avilableQuantity: 0,
                        price: price,
                        profit: 0,
                        profitRatio: 0,
                        cost: price,
                        equity: price * quantity,
                    }
                ]
            }));
        }
    }

    const handleSell = (code: string, name: string, price: number, quantity: number) => {
        if (!isEnabled || isPaused) {
            throw new Error('模拟交易未启用');
        }

        const trade_fee = getTradeFee(price * quantity);
        const position = account.positions.find(position => position.code === code);
        if (!position || position.avilableQuantity < quantity) {
            throw new Error('持仓数量不足');
        }
        setAccount(account => ({
            ...account,
            balance: account.balance - trade_fee,
            equity: account.equity - price * quantity,
            available: account.available + price * quantity - trade_fee,
            profit: account.profit - trade_fee,
            profitToday: account.profitToday - trade_fee,
            positions: account.positions.map(position => {
                if (position.code === code) {
                    let _quantity: number = position.quantity - quantity;
                    let _equity: number = position.equity - price * quantity;
                    return {
                        ...position,
                        quantity: _quantity,
                        avilableQuantity: position.avilableQuantity - quantity,
                        equity: _equity,
                        profitRatio: _quantity !== 0 ? position.profit / (_equity - position.profit) * 100 : position.profitRatio,
                        cost: _quantity !== 0 ? _equity / _quantity : position.cost
                    };
                }
                return position;
            }),
            history: [...account.history, {
                // 交易时间
                tradeDate: currentTradeDate,
                // 股票代码
                code: code,
                // 股票名称
                name: name,
                // 交易价格
                price: price,
                // 交易数量
                quantity: quantity,
                // 交易金额
                amount: price * quantity,
                // 交易类型
                type: 'sell'
            }]

        }))
    }

    const handleToNextTradeDate = () => {
        if (!isEnabled || isPaused) {
            throw new Error('模拟交易未启用');
        }



    }


    return (
        <SimulateTradingContext.Provider value={{
            account, setAccount,
            isEnabled, setEnabled,
            isPaused, setPaused,
            startTradeDate, setStartTradeDate,
            currentTradeDate, setCurrentTradeDate,
            newSimulate: handleNewSimulate, buy: handleBuy, sell: handleSell, toNextTradeDate: handleToNextTradeDate
        }}>
            {children}
        </SimulateTradingContext.Provider>
    );
}

export function useSimulateTradingContext() {
    return useContext(SimulateTradingContext);
}