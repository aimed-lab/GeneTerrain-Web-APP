import React from 'react';
import {
    Box,
    IconButton,
    useDisclosure,
    Drawer,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    Tooltip,
    Icon,
    Flex,
    Text,
    Circle,
} from '@chakra-ui/react';
import { Dna, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatPanel from '../analytics/ChatPanel';
import { useChat } from '../context/ChatContext';

const MotionBox = motion(Box);
const MotionCircle = motion(Circle);

const FloatingChat: React.FC = () => {
    const {
        isOpen,
        setIsOpen,
        messages,
        sendMessage,
        isAnalyzing,
        clearHistory,
        pageContext,
        handleToolAction,
        savedCohorts,
        comparisonCohorts,
        activeCohort,
        removeComparisonCohort,
        runComparisonCart,
        requestTerrainComparison,
    } = useChat();
    const [showBubble, setShowBubble] = React.useState(false);

    // Notification interval
    React.useEffect(() => {
        // Initial show after 2 seconds
        const initialTimer = setTimeout(() => {
            if (!isOpen) setShowBubble(true);
        }, 2000);

        const interval = setInterval(() => {
            if (!isOpen) {
                setShowBubble(true);
                // Hide after 6 seconds
                setTimeout(() => setShowBubble(false), 6000);
            }
        }, 30000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [isOpen]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
        setShowBubble(false);
    };

    return (
        <Box position="fixed" bottom="16px" right="192px" zIndex={1000}>
            {/* --- Floating Action Button --- */}
            <AnimatePresence>
                <Tooltip label={isOpen ? "Close AI Assistant" : "Ask GeneTerrain AI"} placement="left" hasArrow offset={[0, 16]}>
                    <MotionBox
                        whileHover={{ scale: 1.1, y: -5 }}
                        whileTap={{ scale: 0.9 }}
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        position="relative"
                    >
                        {/* Notification Bubble */}
                        <AnimatePresence>
                            {showBubble && !isOpen && (
                                <MotionBox
                                    position="absolute"
                                    bottom="75px"
                                    right="0"
                                    bg="blue.500"
                                    color="white"
                                    px={4}
                                    py={2}
                                    borderRadius="2xl"
                                    boxShadow="xl"
                                    whiteSpace="nowrap"
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                    _after={{
                                        content: '""',
                                        position: 'absolute',
                                        bottom: '-8px',
                                        right: '24px',
                                        borderWidth: '8px 8px 0',
                                        borderStyle: 'solid',
                                        borderColor: 'blue.500 transparent transparent',
                                    }}
                                >
                                    <Text fontSize="xs" fontWeight="bold">Hello! I'm your GeneTerrain AI assistant 👋</Text>
                                </MotionBox>
                            )}
                        </AnimatePresence>

                        <Flex
                            as="button"
                            onClick={toggleChat}
                            w="60px"
                            h="60px"
                            bgGradient="linear(to-br, blue.500, blue.700)"
                            color="white"
                            borderRadius="full"
                            align="center"
                            justify="center"
                            boxShadow="0 8px 32px rgba(66, 153, 225, 0.4)"
                            position="relative"
                            overflow="hidden"
                            _hover={{
                                boxShadow: "0 12px 40px rgba(66, 153, 225, 0.6)",
                                bgGradient: "linear(to-br, blue.600, blue.800)",
                            }}
                        >
                            {/* Pulse Effect for activity */}
                            {isAnalyzing && (
                                <MotionCircle
                                    position="absolute"
                                    size="100%"
                                    border="4px solid white"
                                    opacity={0.3}
                                    initial={{ scale: 0.8, opacity: 0.5 }}
                                    animate={{ scale: 1.5, opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 1.5 } as any}
                                />
                            )}

                            <Icon as={MessageSquare} w={7} h={7} />

                            {/* Active Message Badge */}
                            {!isOpen && messages.length > 1 && (
                                <Circle
                                    size="20px"
                                    bg="red.500"
                                    color="white"
                                    position="absolute"
                                    top="0"
                                    right="0"
                                    fontSize="10px"
                                    fontWeight="bold"
                                    border="2px solid white"
                                >
                                    {messages.filter(m => m.role === 'assistant' && m.id !== 'welcome').length}
                                </Circle>
                            )}
                        </Flex>
                    </MotionBox>
                </Tooltip>
            </AnimatePresence>

            {/* --- Large Resizable Chat Window --- */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <MotionBox
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            position="fixed"
                            top="0"
                            left="0"
                            right="0"
                            bottom="0"
                            bg="blackAlpha.400"
                            backdropFilter="blur(8px)"
                            zIndex={1400}
                            onClick={() => setIsOpen(false)}
                        />
                        <MotionBox
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            position="fixed"
                            top="100px"
                            bottom="100px"
                            right="100px"
                            left="100px"
                            minWidth="400px"
                            minHeight="500px"
                            bg="transparent"
                            zIndex={1500}
                            borderRadius="32px"
                            boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                            style={{ 
                                resize: 'both',
                                overflow: 'hidden'
                            }}
                        >
                            <ChatPanel
                                messages={messages}
                                onSendMessage={sendMessage}
                                onToolAction={handleToolAction}
                                isAnalyzing={isAnalyzing}
                                fileName={pageContext.currentConfig?.dashboardTitle || null}
                                datasetId={pageContext.datasetId}
                                onClose={() => setIsOpen(false)}
                                onClearHistory={clearHistory}
                                savedCohortIds={savedCohorts.map((cohort) => cohort.cohort_id)}
                                comparisonCohortIds={comparisonCohorts.map((cohort) => cohort.cohort_id)}
                                activeCohortId={activeCohort?.cohort_id || null}
                                comparisonCohorts={comparisonCohorts}
                                onRemoveComparisonCohort={removeComparisonCohort}
                                onRunComparisonCart={runComparisonCart}
                                onRequestTerrainComparison={requestTerrainComparison}
                            />
                        </MotionBox>
                    </>
                )}
            </AnimatePresence>
        </Box>

    );
};

export default FloatingChat;
