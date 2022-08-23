import { Center, VStack } from "@chakra-ui/react"
import { Heading, Text } from "@chakra-ui/react"
import { ExternalLink } from "component/ExternalLink"
import FrameContainer from "component/frames/FrameContainer"

function Leaderboard() {
    return (
        <FrameContainer>
            <VStack w="100%" alignItems="normal">
                <Center>
                    <VStack w="100%">
                        <Heading as="h2" size="lg" color="#627EEA">
                            Trading Competiton on zkSync Testnet
                        </Heading>
                        <Text>Aug 29 14:00 UTC — Sep 5 14:00 UTC</Text>
                        <ExternalLink href="https://perpdex.exchange/">
                            <Text color="yellow.base">Competition Rules</Text>
                        </ExternalLink>
                    </VStack>
                </Center>
                <Text marginTop={3} marginBottom={6}>
                    Coming Soon...
                </Text>
                <Heading as="h3" size="md" color="#627EEA">
                    My Trading Score
                </Heading>
                <Heading as="h3" size="md" color="#627EEA">
                    Leaderboard
                </Heading>
                <div>Rules</div>
            </VStack>
        </FrameContainer>
    )
}

export default Leaderboard
