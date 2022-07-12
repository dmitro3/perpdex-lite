import {
    FormControl,
    FormLabel,
    HStack,
    InputGroup,
    InputRightElement,
    NumberInput,
    NumberInputField,
    Text,
} from "@chakra-ui/react"
import { useCallback, useEffect, useMemo, useState } from "react"

import Big from "big.js"
import { BIG_ZERO, USDC_PRECISION } from "constant"
import { formatInput } from "util/format"
import Slider from "component/base/Slider"
import DiscreteLeverageInputModifier from "component/base/DiscreteLeverageInputModifier"

interface PositionInputState {
    baseSymbol: string
    baseOrderValue: Big
    handleInput: (value: Big | null) => void
}

function PositionInput({ baseSymbol, baseOrderValue, handleInput }: PositionInputState) {
    const [position, setPosition] = useState<string>("")

    const handleOnInput = useCallback(
        e => {
            const value = e.target.value
            if (value >= 0) {
                const formattedValue = formatInput(value, USDC_PRECISION)
                setPosition(formattedValue)
                try {
                    formattedValue && handleInput(new Big(formattedValue))
                } catch (err) {
                    console.error(err)
                }
            }
        },
        [handleInput],
    )

    useEffect(() => {
        if (baseOrderValue && baseOrderValue === BIG_ZERO) {
            setPosition("")
        }
    }, [baseOrderValue])

    const [leverage, setLeverage] = useState<number>(1)

    const handleLeverageUpdate = useCallback(
        (value: number) => {
            if (value !== leverage) {
                setLeverage(value)
            }
        },
        [leverage],
    )

    return useMemo(
        () => (
            <FormControl id="margin">
                <FormLabel>
                    <Text fontSize="md" color="white">
                        Collateral
                    </Text>
                </FormLabel>
                <NumberInput value={position} onInput={handleOnInput}>
                    <HStack>
                        <InputGroup>
                            <NumberInputField />
                            <InputRightElement w="54px">
                                <Text
                                    w="100%"
                                    textAlign="center"
                                    fontWeight="bold"
                                    fontSize="xs"
                                    color="blue.500"
                                    textTransform="uppercase"
                                >
                                    {baseSymbol}
                                </Text>
                            </InputRightElement>
                        </InputGroup>
                        <Text fontSize="3xl" ml={2}>
                            /
                        </Text>
                        <InputGroup ml={-1}>
                            <NumberInputField />
                            <InputRightElement w="54px">
                                <Text
                                    w="100%"
                                    textAlign="center"
                                    fontWeight="bold"
                                    fontSize="xs"
                                    color="blue.500"
                                    textTransform="uppercase"
                                >
                                    {baseSymbol}
                                </Text>
                            </InputRightElement>
                        </InputGroup>
                    </HStack>
                </NumberInput>
                <Text fontSize="md" color="white">
                    Leverage
                </Text>
                <Slider currentValue={leverage} handleUpdate={handleLeverageUpdate} />
                <DiscreteLeverageInputModifier handleUpdate={handleLeverageUpdate} />
            </FormControl>
        ),
        [position, handleOnInput, baseSymbol, leverage, handleLeverageUpdate],
    )
}

export default PositionInput
