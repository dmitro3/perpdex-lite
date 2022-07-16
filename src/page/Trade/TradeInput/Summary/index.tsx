import { Heading } from "@chakra-ui/react"
import TxInfoTable from "./TxInfoTable"
import { PerpdexMarketContainer } from "container/connection/perpdexMarketContainer"
import Big from "big.js"

interface Props {
    error: string
    baseAmount: Big
    quoteAmount: Big
}

function Summary(props: Props) {
    const { error, baseAmount, quoteAmount } = props
    const {
        currentMarketState: { markPrice },
    } = PerpdexMarketContainer.useContainer()

    const execPrice = baseAmount.eq(0) ? void 0 : quoteAmount.div(baseAmount)
    const priceImpact = execPrice && markPrice && !markPrice.eq(0) ? execPrice.div(markPrice).sub(1).abs() : void 0

    return (
        <>
            <Heading w="full" size="md">
                Transaction estimation
            </Heading>
            <TxInfoTable execPrice={execPrice} priceImpact={priceImpact} error={error} />
        </>
    )
}

export default Summary
