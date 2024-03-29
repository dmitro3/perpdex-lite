import { BigNumber, ContractTransaction, Signer } from "ethers"
import { BIG_NUMBER_ZERO } from "constant"

import { PerpdexExchange } from "types/newContracts"
import { PerpdexExchangeActions } from "./type"

function getDeadline(): Number {
    return Math.floor(Date.now() / 1000) + 5 * 60
}

export class ContractExecutor implements PerpdexExchangeActions {
    constructor(readonly contract: PerpdexExchange, readonly signer: Signer | undefined) {
        if (signer) {
            this.contract = contract.connect(signer)
        }
    }

    deposit(etherValue: BigNumber, amount: BigNumber): Promise<ContractTransaction> {
        return this.execute("deposit", [amount], etherValue)
    }

    withdraw(amount: BigNumber): Promise<ContractTransaction> {
        return this.execute("withdraw", [amount])
    }

    trade(
        trader: string,
        market: string,
        isBaseToQuote: boolean,
        isExactInput: boolean,
        amount: BigNumber,
        oppositeAmountBound: BigNumber,
    ): Promise<ContractTransaction> {
        return this.execute("trade", [
            {
                trader,
                market,
                isBaseToQuote,
                isExactInput,
                amount,
                oppositeAmountBound,
                deadline: getDeadline(),
            },
        ])
    }

    addLiquidity(
        market: string,
        base: BigNumber,
        quote: BigNumber,
        minBase: BigNumber,
        minQuote: BigNumber,
    ): Promise<ContractTransaction> {
        return this.execute("addLiquidity", [
            {
                market: market,
                base: base,
                quote: quote,
                minBase: minBase,
                minQuote: minQuote,
                deadline: getDeadline(),
            },
        ])
    }

    removeLiquidity(
        trader: string,
        market: string,
        liquidity: BigNumber,
        minBase: BigNumber,
        minQuote: BigNumber,
    ): Promise<ContractTransaction> {
        return this.execute("removeLiquidity", [
            {
                trader: trader,
                market: market,
                liquidity: liquidity,
                minBase: minBase,
                minQuote: minQuote,
                deadline: getDeadline(),
            },
        ])
    }

    createLimitOrder(
        market: string,
        isBid: boolean,
        base: BigNumber,
        priceX96: BigNumber,
        limitOrderType: number,
    ): Promise<ContractTransaction> {
        return this.execute("createLimitOrder", [
            {
                market: market,
                isBid: isBid,
                base: base,
                priceX96: priceX96,
                limitOrderType: limitOrderType,
                deadline: getDeadline(),
            },
        ])
    }

    cancelLimitOrder(market: string, isBid: boolean, orderId: number): Promise<ContractTransaction> {
        return this.execute("cancelLimitOrder", [
            {
                market: market,
                isBid: isBid,
                orderId: orderId,
                deadline: getDeadline(),
            },
        ])
    }

    async execute(funcName: string, args: any[], etherValue?: BigNumber) {
        const overrides = { from: this.contract.signer.getAddress() }

        return this.contract[funcName](...args, {
            ...overrides,
            // NOTE: hard code the gasLimit, until estimateGas function can always return a reasonable number.
            // gasLimit: BigNumber.from(3_800_000),
            value: etherValue ? etherValue : BIG_NUMBER_ZERO,
            // NOTE: Instead of using a lower customized gas price, we use the default gas price which is provided by the metamask.
            // gasPrice: utils.parseUnits("2", "gwei"),
        })
    }
}
