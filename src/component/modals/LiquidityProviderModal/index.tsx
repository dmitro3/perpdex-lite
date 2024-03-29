import { Divider, VStack, Text } from "@chakra-ui/react"
import Collateral from "./Collateral"
import Slippage from "./Slippage"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Modal as ModalContainer } from "container/modal"
import { PerpdexMarketContainer } from "container/connection/perpdexMarketContainer"
import { AddIcon } from "@chakra-ui/icons"
import { PerpdexExchangeContainer } from "container/connection/perpdexExchangeContainer"
import { LpCollateralState } from "constant/types"
import { BIG_ZERO } from "constant"
import { numberWithCommas } from "../../../util/format"
import { Trade } from "../../../container/perpetual/trade"
import Modal from "component/base/Modal"
import Button from "component/base/Button"
import Big from "big.js"
import { Transaction } from "container/connection/transaction"

const initialLpCollateral = {
    base: BIG_ZERO,
    quote: BIG_ZERO,
}

function LiquidityProviderModal() {
    const {
        lpModalIsOpen,
        actions: { toggleLpModal },
    } = ModalContainer.useContainer()

    const { addLiquidity, currentMyAccountInfo } = PerpdexExchangeContainer.useContainer()
    const { currentMarketState } = PerpdexMarketContainer.useContainer()
    const { isLoading } = Transaction.useContainer()

    const { slippage } = Trade.useContainer()
    const [collateralValues, setCollateralValues] = useState<LpCollateralState>(initialLpCollateral)

    const quoteSymbol = currentMarketState.quoteSymbol
    const collateralBalance = currentMyAccountInfo?.collateralBalance || Big(0)

    const isEnabled = useMemo<boolean>(() => {
        if (!currentMarketState) return false
        if (!currentMyAccountInfo) return false
        if (collateralValues.quote.gt(collateralBalance)) return false
        if (collateralValues.base.eq(0) || collateralValues.quote.eq(0)) return false
        return true
    }, [collateralBalance, collateralValues, currentMarketState, currentMyAccountInfo])

    const handleAddLiquidity = useCallback(() => {
        const base = collateralValues.base
        const quote = collateralValues.quote

        addLiquidity(base, quote, slippage)
        console.log("slippage", slippage)
    }, [collateralValues.base, collateralValues.quote, addLiquidity, slippage])

    // Reset values when market is updated
    useEffect(() => {
        if (currentMarketState.baseSymbol) {
            setCollateralValues(initialLpCollateral)
        }
    }, [currentMarketState.baseSymbol])

    return (
        <Modal
            headerText="Add Liquidity"
            isOpen={lpModalIsOpen}
            onClose={toggleLpModal}
            size="md"
            body={
                <VStack spacing={5}>
                    <Text align="center" fontSize="medium" fontWeight="bold" lineHeight="1.4">
                        Mark Price: {numberWithCommas(currentMarketState.markPriceDisplay)}
                        {currentMarketState.priceUnitDisplay}
                    </Text>
                    <Collateral
                        currentMarketState={currentMarketState}
                        collateralValues={collateralValues}
                        setCollateralValues={setCollateralValues}
                    />
                    <Text w="100%" align="right" fontSize="sm" color="gray.500">
                        Balance: {numberWithCommas(collateralBalance)} {quoteSymbol}
                    </Text>
                    <Divider />
                    <Slippage />
                    <Divider />
                </VStack>
            }
            footer={
                <Button
                    text="Add Liquidity"
                    customType="base-blue"
                    onClick={handleAddLiquidity}
                    leftIcon={<AddIcon />}
                    isDisabled={!isEnabled}
                    isLoading={isLoading}
                />
            }
        />
    )
}

export default LiquidityProviderModal
