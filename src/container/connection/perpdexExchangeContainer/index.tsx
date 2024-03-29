import { BIG_NUMBER_ZERO, BIG_BASE_SHARE_DUST, BIG_LIQUIDITY_DUST } from "../../../constant"
import { big2BigNum, bigNum2Big, bigNum2FixedStr, bigToX96, x96ToBig } from "util/format"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Big } from "big.js"
import { Connection } from ".."
import { ContractExecutor } from "./ContractExecutor"
import { Transaction } from "../transaction"
import { createContainer } from "unstated-next"
import { PerpdexMarketContainer } from "../perpdexMarketContainer"
import { BigNumber, constants } from "ethers"
import _ from "lodash"
import { contractConfigs } from "../../../constant/contract"
import {
    ExchangeState,
    MakerInfo,
    TakerInfo,
    AccountInfo,
    PositionState,
    MarketState,
    LimitOrderInfo,
    LimitOrderType,
} from "../../../constant/types"
import { useInterval } from "../../../hook/useInterval"
import { usePageVisibility } from "react-page-visibility"
import {
    createERC20ContractMulticall,
    createExchangeContract,
    createExchangeContractMulticall,
} from "../contractFactory"
import { getErrorMessageFromReason, getReason } from "../../../util/error"

interface settlementTokenMetadataUnit {
    decimals: number
    address: string
}

type settlementTokenMetadataState = settlementTokenMetadataUnit[]

export const PerpdexExchangeContainer = createContainer(usePerpdexExchangeContainer)

const createExchangeExecutor = (address: string, signer: any) => {
    return new ContractExecutor(createExchangeContract(address, signer), signer)
}

function calcTrade(
    isLong: boolean,
    amount: Big,
    marketState: MarketState,
    slippage: number,
    currentTakerBaseShare: Big,
) {
    const _slippage = slippage / 100
    const { markPrice, baseBalancePerShare } = marketState

    let oppositeAmountBound
    if (isLong) {
        oppositeAmountBound = amount.mul(markPrice).mul(1 + _slippage)
    } else {
        oppositeAmountBound = amount.mul(markPrice).mul(1 - _slippage)
    }

    let share = amount.div(baseBalancePerShare)
    const shareDust = BIG_BASE_SHARE_DUST.div(baseBalancePerShare)
    if (
        currentTakerBaseShare.lt(0) === isLong &&
        currentTakerBaseShare
            .add(share.mul(isLong ? 1 : -1))
            .abs()
            .lte(shareDust)
    ) {
        share = currentTakerBaseShare.abs()
    }

    console.log("@@@@", isLong, amount.toString(), oppositeAmountBound.toString())

    return {
        baseShare: share,
        isBaseToQuote: !isLong,
        isExactInput: !isLong,
        oppositeAmountBound: big2BigNum(oppositeAmountBound),
    }
}

const limitOrderTypeToNumber = (limitOrderType: LimitOrderType): number => {
    return {
        Normal: 0,
        PostOnly: 1,
        Ioc: 2,
    }[limitOrderType]
}

function usePerpdexExchangeContainer() {
    const { account, signer, chainId, multicallNetworkProvider } = Connection.useContainer()
    const { currentMarketState, currentMarket } = PerpdexMarketContainer.useContainer()
    const { execute } = Transaction.useContainer()
    const isVisible = usePageVisibility()

    // core
    const [exchangeStates, setExchangeStates] = useState<{ [key: string]: ExchangeState }>({})
    const [settlementTokenMetadata, setSettlementTokenMetadata] = useState<settlementTokenMetadataState>([])

    // utils (this can be separated into other container)
    const currentExchange: string = useMemo(() => {
        return currentMarketState?.exchangeAddress
    }, [currentMarketState?.exchangeAddress])
    const currentExchangeState: ExchangeState | undefined = useMemo(() => {
        return exchangeStates[currentExchange]
    }, [exchangeStates, currentExchange])
    const contractExecuter: ContractExecutor = useMemo(() => {
        return createExchangeExecutor(currentExchange, signer)
    }, [currentExchange, signer])
    const perpdexExchange = useMemo(() => {
        return createExchangeContract(currentExchange, signer)
    }, [currentExchange, signer])
    const currentMyAccountInfo: AccountInfo | undefined = useMemo(() => {
        return exchangeStates[currentExchange]?.myAccountInfo
    }, [exchangeStates, currentExchange])
    const currentMyMakerInfo: MakerInfo | undefined = useMemo(() => {
        return exchangeStates[currentExchange]?.myAccountInfo.makerInfos[currentMarket]
    }, [exchangeStates, currentExchange, currentMarket])
    const currentMyTakerInfo: TakerInfo | undefined = useMemo(() => {
        return exchangeStates[currentExchange]?.myAccountInfo.takerInfos[currentMarket]
    }, [exchangeStates, currentExchange, currentMarket])
    const currentMyAskInfos: { [key: string]: LimitOrderInfo } = useMemo(() => {
        return exchangeStates[currentExchange]?.myAccountInfo.askInfos[currentMarket] || {}
    }, [exchangeStates, currentExchange, currentMarket])
    const currentMyBidInfos: { [key: string]: LimitOrderInfo } = useMemo(() => {
        return exchangeStates[currentExchange]?.myAccountInfo.bidInfos[currentMarket] || {}
    }, [exchangeStates, currentExchange, currentMarket])

    const currentMyTakerPositions: PositionState | undefined = useMemo(() => {
        if (currentMarketState && currentMyTakerInfo) {
            const { markPrice, baseBalancePerShare } = currentMarketState

            const takerOpenNotional = currentMyTakerInfo.quoteBalance
            const size = currentMyTakerInfo.baseBalanceShare.mul(baseBalancePerShare)
            if (size.eq(0)) return

            const positionValue = size.mul(markPrice)
            const entryPrice = takerOpenNotional.abs().div(size.abs())
            const unrealizedPnl = markPrice.div(entryPrice).sub(1).mul(takerOpenNotional.mul(-1))
            const isLong = size.gt(0)

            return {
                isLong: isLong,
                isLongDisplay: currentMarketState.inverse ? !isLong : isLong,
                positionQuantity: size,
                positionValue,
                entryPriceDisplay: currentMarketState.inverse ? Big(1).div(entryPrice) : entryPrice,
                liqPriceDisplay: Big(0),
                unrealizedPnl,
            }
        }
        return
    }, [currentMarketState, currentMyTakerInfo])

    const fetchAll = useCallback(async () => {
        if (!chainId) return
        if (!account) return
        if (!multicallNetworkProvider) return

        const exchanges = contractConfigs[chainId].exchanges

        let settlementTokenMetadataLocal: settlementTokenMetadataState = settlementTokenMetadata
        if (_.isEmpty(settlementTokenMetadataLocal)) {
            const multicallRequest2 = _.map(exchanges, exchange => {
                const contract = createExchangeContractMulticall(exchange.address)
                return contract.settlementToken()
            })
            const settlementTokens = await multicallNetworkProvider.all(multicallRequest2)

            const multicallRequest3 = _.flattenDeep(
                _.map(settlementTokens, settlementToken => {
                    return [
                        settlementToken === constants.AddressZero
                            ? multicallNetworkProvider.getEthBalance(constants.AddressZero) // dummy
                            : createERC20ContractMulticall(settlementToken).decimals(),
                    ]
                }),
            )
            const decimals = await multicallNetworkProvider.all(multicallRequest3)

            settlementTokenMetadataLocal = _.map(settlementTokens, (settlementToken, idx) => {
                return {
                    decimals: settlementToken === constants.AddressZero ? 18 : decimals[idx].toNumber(),
                    address: settlementToken,
                }
            })
            setSettlementTokenMetadata(settlementTokenMetadataLocal)
        }

        const multicallRequest = _.flattenDeep(
            _.map(exchanges, (exchange, idx) => {
                const contract = createExchangeContractMulticall(exchange.address)
                return [
                    contract.imRatio(),
                    contract.mmRatio(),
                    settlementTokenMetadataLocal[idx].address === constants.AddressZero
                        ? multicallNetworkProvider.getEthBalance(account)
                        : createERC20ContractMulticall(settlementTokenMetadataLocal[idx].address).balanceOf(account),
                    contract.getCollateralBalance(account),
                    contract.getTotalAccountValue(account),
                    contract.getTotalPositionNotional(account),
                    _.map(exchange.markets, market => {
                        return [
                            contract.getTakerInfoLazy(account, market.address),
                            contract.getMakerInfo(account, market.address),
                            contract.getLimitOrderSummaries(account, market.address, false),
                            contract.getLimitOrderSummaries(account, market.address, true),
                        ]
                    }),
                ]
            }),
        )
        const multicallResult = await multicallNetworkProvider.all(multicallRequest)

        const newExchangeStates: { [key: string]: ExchangeState } = {}

        let resultIdx = 0
        _.each(exchanges, (exchange, idx) => {
            const [
                imRatio,
                mmRatio,
                settlementTokenBalance,
                collateralBalance,
                totalAccountValueBigNum,
                totalPositionNotionalBigNum,
            ] = multicallResult.slice(resultIdx, resultIdx + 6)
            resultIdx += 6

            const takerInfos: { [key: string]: TakerInfo } = {}
            const makerInfos: { [key: string]: MakerInfo } = {}
            const askInfos: { [key: string]: { [key: string]: LimitOrderInfo } } = {}
            const bidInfos: { [key: string]: { [key: string]: LimitOrderInfo } } = {}

            _.each(exchange.markets, market => {
                const [takerInfo, makerInfo, askSummaries, bidSummaries] = multicallResult.slice(
                    resultIdx,
                    resultIdx + 4,
                )
                resultIdx += 4

                takerInfos[market.address] = {
                    baseBalanceShare: bigNum2Big(takerInfo.baseBalanceShare),
                    quoteBalance: bigNum2Big(takerInfo.quoteBalance),
                }
                makerInfos[market.address] = {
                    liquidity: bigNum2Big(makerInfo.liquidity),
                    cumBaseSharePerLiquidity: x96ToBig(makerInfo.cumBaseSharePerLiquidityX96),
                    cumQuotePerLiquidity: x96ToBig(makerInfo.cumQuotePerLiquidityX96),
                }

                const makeLimitOrderInfo = (summaries: any) => {
                    const result: { [key: string]: LimitOrderInfo } = {}
                    _.each(summaries, summary => {
                        const orderId = summary.orderId
                        result[orderId] = {
                            base: bigNum2Big(summary.base),
                            price: x96ToBig(summary.priceX96),
                        }
                    })
                    return result
                }
                askInfos[market.address] = makeLimitOrderInfo(askSummaries)
                bidInfos[market.address] = makeLimitOrderInfo(bidSummaries)
            })

            const totalAccountValue = bigNum2Big(totalAccountValueBigNum)
            const totalPositionNotional = bigNum2Big(totalPositionNotionalBigNum)

            newExchangeStates[exchange.address] = {
                imRatio: bigNum2Big(imRatio, 6),
                mmRatio: bigNum2Big(mmRatio, 6),
                myAccountInfo: {
                    takerInfos: takerInfos,
                    makerInfos: makerInfos,
                    askInfos: askInfos,
                    bidInfos: bidInfos,
                    settlementTokenBalance: bigNum2Big(
                        settlementTokenBalance,
                        settlementTokenMetadataLocal[idx].decimals,
                    ),
                    collateralBalance: bigNum2Big(collateralBalance),
                    totalAccountValue: totalAccountValue,
                    leverage: totalAccountValue.eq(0) ? Big(0) : totalPositionNotional.div(totalAccountValue),
                    marginRatio: totalPositionNotional.eq(0) ? Big(0) : totalAccountValue.div(totalPositionNotional),
                },
            }
        })
        return newExchangeStates
    }, [account, chainId, multicallNetworkProvider, settlementTokenMetadata])

    useEffect(() => {
        ;(async () => {
            let newExchangeStates
            try {
                newExchangeStates = await fetchAll()
            } catch (err) {
                console.log(err)
            }
            if (!newExchangeStates) return

            console.log("newExchangeStates", newExchangeStates)
            setExchangeStates(newExchangeStates)
        })()
    }, [chainId, multicallNetworkProvider, account, fetchAll])

    const deposit = useCallback(
        (amount: Big) => {
            if (contractExecuter) {
                // TODO: handle non native token
                execute(contractExecuter.deposit(big2BigNum(amount), BIG_NUMBER_ZERO))
            }
        },
        [contractExecuter, execute],
    )

    const withdraw = useCallback(
        (amount: Big) => {
            if (contractExecuter) {
                // TODO: handle non native token
                execute(contractExecuter.withdraw(big2BigNum(amount)))
            }
        },
        [contractExecuter, execute],
    )

    const trade = useCallback(
        (isLong: boolean, baseAmount: Big, slippage: number) => {
            if (!currentMarketState || !currentMarketState.markPrice) return
            const { baseShare, isBaseToQuote, isExactInput, oppositeAmountBound } = calcTrade(
                isLong,
                baseAmount,
                currentMarketState,
                slippage,
                currentMyTakerInfo?.baseBalanceShare || Big(0),
            )

            if (contractExecuter && account && currentMarket) {
                execute(
                    contractExecuter.trade(
                        account,
                        currentMarket,
                        isBaseToQuote,
                        isExactInput,
                        big2BigNum(baseShare),
                        oppositeAmountBound,
                    ),
                )
            }
        },
        [currentMarketState, contractExecuter, account, currentMarket, execute, currentMyTakerInfo?.baseBalanceShare],
    )

    const previewTrade = useCallback(
        async (isLong: boolean, baseAmount: Big, slippage: number) => {
            if (!perpdexExchange || !account || !currentMarketState?.markPrice || currentMarketState?.markPrice.eq(0))
                return "not prepared"

            const { baseShare, isBaseToQuote, isExactInput, oppositeAmountBound } = calcTrade(
                isLong,
                baseAmount,
                currentMarketState,
                slippage,
                currentMyTakerInfo?.baseBalanceShare || Big(0),
            )

            console.log(baseAmount, bigNum2FixedStr(oppositeAmountBound, 18))

            try {
                const results = await perpdexExchange.callStatic.trade({
                    trader: account,
                    market: currentMarket,
                    isBaseToQuote,
                    isExactInput,
                    amount: big2BigNum(baseShare),
                    oppositeAmountBound,
                    deadline: BigNumber.from(2).pow(96),
                })
                return results
            } catch (err) {
                console.error("Error previewTrade", err)
                return getErrorMessageFromReason(getReason(err))
            }
        },
        [account, perpdexExchange, currentMarket, currentMarketState?.markPrice, currentMyTakerInfo?.baseBalanceShare],
    )

    const maxTrade = useCallback(
        async (isBaseToQuote: boolean) => {
            if (account && currentMarket) {
                const isExactInput = isBaseToQuote

                try {
                    const results = await perpdexExchange.callStatic.maxTrade({
                        trader: account,
                        market: currentMarket,
                        caller: account,
                        isBaseToQuote,
                        isExactInput,
                    })
                    return results
                } catch (err) {
                    console.error("Error maxTrade", err)
                }
            }
        },
        [account, currentMarket, perpdexExchange.callStatic],
    )

    const previewCreateLimitOrder = useCallback(
        async (isBid: boolean, baseAmount: Big, price: Big, limitOrderType: LimitOrderType) => {
            if (!perpdexExchange || !account || !currentMarketState?.markPrice || currentMarketState?.markPrice.eq(0))
                return "not prepared"

            const baseShare = baseAmount.div(currentMarketState.baseBalancePerShare)

            try {
                const results = await perpdexExchange.callStatic.createLimitOrder({
                    market: currentMarket,
                    isBid: isBid,
                    base: big2BigNum(baseShare),
                    priceX96: bigToX96(price),
                    limitOrderType: limitOrderTypeToNumber(limitOrderType),
                    deadline: BigNumber.from(2).pow(96),
                })
                return results
            } catch (err) {
                console.error("Error previewCreateLimitOrder", err)
                return getErrorMessageFromReason(getReason(err))
            }
        },
        [account, perpdexExchange, currentMarket, currentMarketState?.markPrice, currentMyTakerInfo?.baseBalanceShare],
    )

    useEffect(() => {
        ;(async () => {
            const results = await maxTrade(false)
            results && console.log("maxTrade:", bigNum2Big(results).toString())
        })()
    }, [maxTrade])

    const addLiquidity = useCallback(
        (baseAmount: Big, quote: Big, slippage: number) => {
            if (contractExecuter && account && currentMarketState && !currentMarketState.baseBalancePerShare.eq(0)) {
                const baseShare = baseAmount.div(currentMarketState.baseBalancePerShare)
                const minBaseShare = baseShare.mul(1.0 - slippage / 100)
                const minQuote = quote.mul(1.0 - slippage / 100)

                execute(
                    contractExecuter.addLiquidity(
                        currentMarket,
                        big2BigNum(baseShare),
                        big2BigNum(quote),
                        big2BigNum(minBaseShare),
                        big2BigNum(minQuote),
                    ),
                )
            }
        },
        [account, contractExecuter, execute, currentMarketState, currentMarketState.baseBalancePerShare],
    )

    const removeLiquidity = useCallback(
        (liquidity: Big, slippage: number) => {
            if (contractExecuter && account && currentMarket && currentMarketState.poolInfo) {
                if (currentMyMakerInfo?.liquidity.sub(liquidity).abs().lte(BIG_LIQUIDITY_DUST)) {
                    liquidity = currentMyMakerInfo?.liquidity
                }

                const poolInfo = currentMarketState.poolInfo
                const baseShare = liquidity.mul(poolInfo.base).div(poolInfo.totalLiquidity)
                const quote = liquidity.mul(poolInfo.quote).div(poolInfo.totalLiquidity)
                const minBaseShare = baseShare.mul(1.0 - slippage / 100)
                const minQuote = quote.mul(1.0 - slippage / 100)

                execute(
                    contractExecuter.removeLiquidity(
                        account,
                        currentMarket,
                        big2BigNum(liquidity),
                        big2BigNum(minBaseShare),
                        big2BigNum(minQuote),
                    ),
                )
            }
        },
        [account, contractExecuter, execute, currentMarket, currentMarketState.poolInfo],
    )

    const createLimitOrder = useCallback(
        (isBid: boolean, baseAmount: Big, price: Big, limitOrderType: LimitOrderType) => {
            if (contractExecuter && account && currentMarketState && !currentMarketState.baseBalancePerShare.eq(0)) {
                const baseShare = baseAmount.div(currentMarketState.baseBalancePerShare)

                execute(
                    contractExecuter.createLimitOrder(
                        currentMarket,
                        isBid,
                        big2BigNum(baseShare),
                        bigToX96(price),
                        limitOrderTypeToNumber(limitOrderType),
                    ),
                )
            }
        },
        [account, contractExecuter, execute, currentMarketState, currentMarketState.baseBalancePerShare],
    )

    const cancelLimitOrder = useCallback(
        (isBid: boolean, orderId: number) => {
            if (contractExecuter && account && currentMarket) {
                execute(contractExecuter.cancelLimitOrder(currentMarket, isBid, orderId))
            }
        },
        [account, contractExecuter, execute, currentMarket],
    )

    const setCollateralBalance = useCallback(
        async (collateralBalance: Big) => {
            if (account && signer && currentExchange) {
                const contract = createExchangeContract(currentExchange, signer)
                await contract.setCollateralBalance(account, big2BigNum(collateralBalance))
            }
        },
        [account, signer, currentExchange],
    )

    useInterval(async () => {
        if (!isVisible) return

        console.log("perpdexExchangeContainer polling")

        let newExchangeStates
        try {
            newExchangeStates = await fetchAll()
        } catch (err) {
            console.log(err)
        }
        if (!newExchangeStates) return

        console.log("newExchangeStates", newExchangeStates)
        setExchangeStates(newExchangeStates)
    }, 5000)

    return {
        // core functions
        exchangeStates,
        // utils (my account of current market)
        currentExchangeState,
        currentMyAccountInfo,
        currentMyMakerInfo,
        currentMyTakerInfo,
        currentMyAskInfos,
        currentMyBidInfos,
        currentMyTakerPositions,
        deposit,
        withdraw,
        trade,
        addLiquidity,
        removeLiquidity,
        createLimitOrder,
        cancelLimitOrder,
        preview: {
            trade: previewTrade,
            maxTrade: maxTrade,
            createLimitOrder: previewCreateLimitOrder,
        },
        setCollateralBalance,
    }
}
