import { QuestionOutlineIcon } from "@chakra-ui/icons"
import {
    Text,
    Heading,
    SimpleGrid,
    Box,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Divider,
    Center,
    VStack,
    Flex,
    HStack,
} from "@chakra-ui/react"
import { InverseMarket } from "constant/market"
import { MakerPositionInfo } from "."

interface ProvidedInfoTableProps {
    marketInfo?: InverseMarket
    makerPositionInfo: MakerPositionInfo
}

function ProvidedInfoTable({ marketInfo, makerPositionInfo }: ProvidedInfoTableProps) {
    return (
        <>
            <Heading w="full" size="sm">
                Provided Liquidity
            </Heading>
            <SimpleGrid width="100%" columns={2} spacing={6}>
                <Box>
                    <Text fontSize="xs" color="gray.500">
                        Total Liquidity
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" lineHeight="1.4">
                        {makerPositionInfo.liquidityValue.eq(0) ? "-" : makerPositionInfo.liquidityValue.toFixed(6)}{" "}
                        {marketInfo?.quoteAssetSymbol}
                    </Text>
                </Box>
                <Box>
                    <Text fontSize="xs" color="gray.500">
                        Unrealized Pnl{" "}
                        <Popover trigger="hover">
                            <PopoverTrigger>
                                <QuestionOutlineIcon></QuestionOutlineIcon>
                            </PopoverTrigger>
                            <PopoverContent>
                                <PopoverBody>
                                    Total fees earned from current liquidity. Added to Free Collateral automatically.
                                </PopoverBody>
                            </PopoverContent>
                        </Popover>
                    </Text>
                    <Text fontSize="xl" color="green.400" fontWeight="bold" lineHeight="1.4">
                        {makerPositionInfo.liquidityValue.eq(0) ? "-" : makerPositionInfo.unrealizedPnl.toFixed(6)}{" "}
                        {marketInfo?.quoteAssetSymbol}
                    </Text>
                </Box>
                <Box>
                    <Text fontSize="xs" color="gray.500">
                        Base assets
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" lineHeight="1.4">
                        {makerPositionInfo.liquidityValue.eq(0) ? "-" : makerPositionInfo.baseAmount.toFixed(6)}{" "}
                        {marketInfo?.baseAssetSymbol}
                    </Text>
                </Box>
                <Box>
                    <Text fontSize="xs" color="gray.500">
                        Quote assets
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" lineHeight="1.4">
                        {makerPositionInfo.liquidityValue.eq(0) ? "-" : makerPositionInfo.quoteAmount.toFixed(6)}{" "}
                        {marketInfo?.quoteAssetSymbol}
                    </Text>
                </Box>
                <Box>
                    <Text fontSize="xs" color="gray.500">
                        Base debt
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" lineHeight="1.4">
                        {makerPositionInfo.liquidityValue.eq(0) ? "-" : makerPositionInfo.baseDebt.toFixed(6)}{" "}
                        {marketInfo?.baseAssetSymbol}
                    </Text>
                </Box>
                <Box>
                    <Text fontSize="xs" color="gray.500">
                        Quote debt
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" lineHeight="1.4">
                        {makerPositionInfo.liquidityValue.eq(0) ? "-" : makerPositionInfo.quoteDebt.toFixed(6)}{" "}
                        {marketInfo?.quoteAssetSymbol}
                    </Text>
                </Box>
            </SimpleGrid>
            <Divider orientation="horizontal" />
            <Flex direction="row" width="100%" justifyContent="space-between">
                <VStack pr="6" flexGrow={2}>
                    <Box width="100%">
                        <HStack justifyContent="space-between" alignItems="center">
                            <Text fontSize="xs" color="gray.500">
                                Base APR{" "}
                                <Popover trigger="hover">
                                    <PopoverTrigger>
                                        <QuestionOutlineIcon></QuestionOutlineIcon>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <PopoverBody>The est. APR from trading fees</PopoverBody>
                                    </PopoverContent>
                                </Popover>
                            </Text>
                            <Text fontSize="sm" color="green.400" fontWeight="bold" lineHeight="1.6">
                                -%
                            </Text>
                        </HStack>
                    </Box>
                    <Box width="100%">
                        <HStack justifyContent="space-between" alignItems="center">
                            <Text fontSize="xs" color="gray.500">
                                Rewards APR{" "}
                                <Popover trigger="hover">
                                    <PopoverTrigger>
                                        <QuestionOutlineIcon></QuestionOutlineIcon>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <PopoverBody>The est. APR from liquidity mining rewards</PopoverBody>
                                    </PopoverContent>
                                </Popover>
                            </Text>
                            <Text fontSize="sm" color="green.400" fontWeight="bold" lineHeight="1.4">
                                -
                            </Text>
                        </HStack>
                    </Box>
                </VStack>
                <Center height="50px">
                    <Divider orientation="vertical" />
                </Center>
                <VStack pl="6" flexGrow={2}>
                    <Box width="100%">
                        <HStack justifyContent="space-between" alignItems="center">
                            <Text fontSize="xs" color="gray.500">
                                Margin Ratio
                            </Text>
                            <Text fontSize="sm" color="green.400" fontWeight="bold" lineHeight="1.6">
                                -
                            </Text>
                        </HStack>
                    </Box>
                    <Box width="100%">
                        <HStack justifyContent="space-between" alignItems="center">
                            <Text fontSize="xs" color="gray.500">
                                Account Leverage
                            </Text>
                            <Text fontSize="sm" fontWeight="bold" lineHeight="1.4" color="red.400">
                                -
                            </Text>
                        </HStack>
                    </Box>
                </VStack>
            </Flex>
            <Divider orientation="horizontal" />
        </>
    )
}

export default ProvidedInfoTable