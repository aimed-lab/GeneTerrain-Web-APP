
import React, { useState, useMemo } from 'react';
import {
    Box,
    Grid,
    VStack,
    HStack,
    Text,
    Input,
    Select,
    Badge,
    Divider,
    useColorModeValue,
    Flex,
    Progress,
} from '@chakra-ui/react';
import { Search } from 'lucide-react';
import { DatasetProfile, ColumnStats } from './types';

interface StatsPanelProps {
    profile: DatasetProfile;
    dataset1Label?: string;
    dataset2Label?: string;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ profile }) => {
    const [filterQuery, setFilterQuery] = useState('');
    const [selectedColumn, setSelectedColumn] = useState<string>('all');

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const inputBg = useColorModeValue('gray.50', 'gray.900');
    const barBg = useColorModeValue('gray.100', 'gray.700');

    const columnEntries = Object.entries(profile.columnStats);

    const filteredColumns = useMemo(() => {
        return columnEntries.filter(([name]) => {
            const matchesQuery = name.toLowerCase().includes(filterQuery.toLowerCase());
            const matchesSelect = selectedColumn === 'all' || name === selectedColumn;
            return matchesQuery && matchesSelect;
        });
    }, [columnEntries, filterQuery, selectedColumn]);

    return (
        <VStack spacing={8} align="stretch" w="full">
            {/* Filter Header */}
            <Box
                p={6}
                bg={bgColor}
                borderRadius="2xl"
                border="1px"
                borderColor={borderColor}
                shadow="sm"
            >
                <Grid templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap={4}>
                    <VStack align="start" spacing={2}>
                        <Text fontSize="10px" fontWeight="black" textTransform="uppercase" color="gray.500" letterSpacing="widest">
                            Search Dimensions
                        </Text>
                        <HStack w="full" bg={inputBg} borderRadius="xl" px={4} border="1px" borderColor={borderColor}>
                            <Search size={14} color="gray" />
                            <Input
                                variant="unstyled"
                                placeholder="Filter by column name..."
                                fontSize="xs"
                                py={3}
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                            />
                        </HStack>
                    </VStack>
                    <VStack align="start" spacing={2}>
                        <Text fontSize="10px" fontWeight="black" textTransform="uppercase" color="gray.500" letterSpacing="widest">
                            Quick Jump
                        </Text>
                        <Select
                            size="sm"
                            borderRadius="xl"
                            bg={inputBg}
                            value={selectedColumn}
                            onChange={(e) => setSelectedColumn(e.target.value)}
                            fontSize="xs"
                        >
                            <option value="all">View All Columns</option>
                            {columnEntries.map(([name]) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </Select>
                    </VStack>
                </Grid>
            </Box>

            {/* Stats Grid */}
            <Grid
                templateColumns={{
                    base: '1fr',
                    md: 'repeat(2, 1fr)',
                    xl: 'repeat(3, 1fr)'
                }}
                gap={6}
            >
                {filteredColumns.map(([name, stats]) => (
                    <Box
                        key={name}
                        p={6}
                        bg={bgColor}
                        borderRadius="2xl"
                        border="1px"
                        borderColor={borderColor}
                        transition="all 0.2s"
                        _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                    >
                        <Flex justify="space-between" align="center" mb={4}>
                            <Text fontSize="xs" fontWeight="black" textTransform="uppercase" letterSpacing="tight" noOfLines={1} pr={4}>
                                {name.replace(/_/g, ' ')}
                            </Text>
                            <Badge
                                fontSize="8px"
                                colorScheme={stats.type === 'numeric' ? 'blue' : 'green'}
                                variant="subtle"
                                p={1}
                                borderRadius="md"
                            >
                                {stats.type}
                            </Badge>
                        </Flex>

                        <VStack align="stretch" spacing={3}>
                            <HStack justify="space-between" fontSize="10px">
                                <Text color="gray.500" fontWeight="bold">UNIQUE VALUES</Text>
                                <Text fontWeight="bold">{stats.uniqueCount.toLocaleString()}</Text>
                            </HStack>
                            <HStack justify="space-between" fontSize="10px">
                                <Text color="gray.500" fontWeight="bold">MISSING DATA</Text>
                                <Text color={stats.missingValues > 0 ? 'red.500' : 'gray.500'} fontWeight="bold">
                                    {((stats.missingValues / profile.rows) * 100).toFixed(1)}%
                                </Text>
                            </HStack>

                            <Divider py={1} />

                            {stats.type === 'numeric' ? (
                                <VStack align="stretch" spacing={2} pt={1}>
                                    <HStack justify="space-between" fontSize="10px">
                                        <Text color="gray.500">AVERAGE</Text>
                                        <Text color="blue.500" fontWeight="black">{stats.mean?.toFixed(2)}</Text>
                                    </HStack>
                                    <HStack justify="space-between" fontSize="10px">
                                        <Text color="gray.500">DOMAIN</Text>
                                        <Text color="blue.500" fontWeight="black">{stats.min} — {stats.max}</Text>
                                    </HStack>
                                </VStack>
                            ) : (
                                <VStack align="stretch" spacing={3} pt={1}>
                                    <Text fontSize="8px" fontWeight="black" color="gray.400" textTransform="uppercase" letterSpacing="widest">
                                        Distribution Highs
                                    </Text>
                                    {stats.topValues?.map((tv, idx) => (
                                        <VStack key={idx} spacing={1} align="stretch">
                                            <Flex justify="space-between" fontSize="9px">
                                                <Text color="gray.600" noOfLines={1} maxW="70%">{tv.value}</Text>
                                                <Text fontWeight="bold">{((tv.count / profile.rows) * 100).toFixed(1)}%</Text>
                                            </Flex>
                                            <Progress
                                                value={(tv.count / profile.rows) * 100}
                                                size="xs"
                                                colorScheme="green"
                                                borderRadius="full"
                                                bg={barBg}
                                            />
                                        </VStack>
                                    ))}
                                </VStack>
                            )}
                        </VStack>
                    </Box>
                ))}
            </Grid>
        </VStack>
    );
};

export default StatsPanel;
