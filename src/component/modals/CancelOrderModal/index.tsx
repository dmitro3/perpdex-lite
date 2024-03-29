import { useCallback, useMemo } from "react"
import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import { PerpdexExchangeContainer } from "container/connection/perpdexExchangeContainer"
import { Transaction } from "container/connection/transaction"
import { Modal as ModalContainer } from "container/modal"
import { PerpdexMarketContainer } from "../../../container/connection/perpdexMarketContainer"
import Modal from "component/base/Modal"
import Button from "component/base/Button"
import { LimitOrderInfo } from "../../../constant/types"
import Big from "big.js"

function CancelOrderModal() {
    const {
        cancelOrderModalIsOpen,
        cancelOrderModalState: { isBid, orderId },
        actions: { toggleCancelOrderModal },
    } = ModalContainer.useContainer()

    const { isLoading: isTxLoading } = Transaction.useContainer()
    const { currentMyAskInfos, currentMyBidInfos, cancelLimitOrder } = PerpdexExchangeContainer.useContainer()
    const { currentMarketState } = PerpdexMarketContainer.useContainer()

    const orderInfo: LimitOrderInfo | undefined = useMemo(() => {
        return (isBid ? currentMyBidInfos : currentMyAskInfos)[orderId]
    }, [isBid, currentMyAskInfos, currentMyBidInfos, orderId])

    const isDisabled = useMemo(() => {
        return !orderInfo
    }, [orderInfo])

    const priceDisplay = useMemo(() => {
        try {
            return currentMarketState.inverse ? Big(1).div(orderInfo?.price) : orderInfo?.price
        } catch {
            return orderInfo?.price
        }
    }, [orderInfo?.price, currentMarketState.inverse])

    const handleCloseMarket = useCallback(() => {
        if (orderInfo) {
            cancelLimitOrder(isBid, orderId)
        }
    }, [cancelLimitOrder, isBid, orderId, orderInfo])

    const handleCloseModal = useCallback(() => {
        toggleCancelOrderModal()
    }, [toggleCancelOrderModal])

    return useMemo(
        () => (
            <Modal
                headerText="Cancel Order"
                isOpen={cancelOrderModalIsOpen}
                onClose={handleCloseModal}
                size="md"
                body={
                    <VStack w="100%" p={2}>
                        <Box w="100%">
                            <HStack justifyContent="space-between">
                                <Text as="span" color="gray.500">
                                    Side:{" "}
                                </Text>
                                <Text as="span" color={isBid !== currentMarketState.inverse ? "green.300" : "red.300"}>
                                    {isBid !== currentMarketState.inverse ? "Buy" : "Sell"}
                                </Text>
                            </HStack>
                        </Box>
                        <Box w="100%">
                            <HStack justifyContent="space-between">
                                <Text as="span" color="gray.500">
                                    Size:
                                </Text>
                                <Text as="span" color="gray.500">
                                    {orderInfo?.base?.toFixed(7)} {currentMarketState.baseSymbol}
                                </Text>
                            </HStack>
                        </Box>
                        <Box w="100%">
                            <HStack justifyContent="space-between">
                                <Text as="span" color="gray.500">
                                    Price:
                                </Text>
                                <Text as="span" color="gray.500">
                                    {priceDisplay?.toFixed(7)}
                                </Text>
                            </HStack>
                        </Box>
                    </VStack>
                }
                footer={
                    <Button
                        text="Confirm"
                        customType="base-blue"
                        onClick={handleCloseMarket}
                        isDisabled={isDisabled}
                        isLoading={isTxLoading}
                    />
                }
            />
        ),
        [
            isBid,
            orderId,
            orderInfo?.base,
            priceDisplay,
            currentMarketState.inverse,
            cancelOrderModalIsOpen,
            handleCloseModal,
            currentMarketState.baseSymbol,
            handleCloseMarket,
            isDisabled,
            isTxLoading,
        ],
    )
}

export default CancelOrderModal
