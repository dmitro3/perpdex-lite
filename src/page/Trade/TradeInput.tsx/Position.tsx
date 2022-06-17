import { FormControl, Input, InputGroup, InputRightElement, Text } from "@chakra-ui/react"

import { PerpdexMarketContainer } from "container/perpdexMarketContainer"
import SmallFormLabel from "component/SmallFormLabel"
import { usePositionSize } from "../usePositionSize"
import { Trade } from "container/trade"

function Position() {
    const {
        state: { currentMarketInfo },
    } = PerpdexMarketContainer.useContainer()
    const { isBaseToQuote } = Trade.useContainer()

    const { positionSize, isCalculating } = usePositionSize()

    return (
        <FormControl id="position">
            <SmallFormLabel>Position</SmallFormLabel>
            <InputGroup>
                <Input variant="filled" isReadOnly value={isCalculating ? "⃜⏳" : positionSize} />
                <InputRightElement w="54px">
                    <Text
                        w="100%"
                        textAlign="center"
                        fontWeight="bold"
                        fontSize="xs"
                        color="gray.500"
                        textTransform="uppercase"
                    >
                        {isBaseToQuote ? currentMarketInfo?.baseAssetSymbol : currentMarketInfo?.quoteAssetSymbol}
                    </Text>
                </InputRightElement>
            </InputGroup>
        </FormControl>
    )
}

export default Position