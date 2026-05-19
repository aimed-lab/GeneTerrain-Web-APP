/**
 * TerrainComparisonOverlay
 *
 * Lives at App level (always mounted, any route). Listens to
 * ChatContext.terrainComparisonRequest and, when triggered, fetches
 * gene-expression terrain data for each cohort, then opens the
 * ComparisonPopup side-by-side view.
 *
 * This must be at App level (not inside HomeContent) so it fires even
 * when the user is on a different page when they click "Compare Terrains".
 */
import React, { useEffect, useState } from "react";
import { Box, Spinner, Text, useToast } from "@chakra-ui/react";
import { useChat } from "../context/ChatContext";
import { ComparisonPopup } from "../../GaussianPlots/ComparisonPopup";
import { fetchGeneExpressionData } from "../../modules/GeneExpressionDataFetcher";
import { fetchDatasetById } from "../../services/datasetService";

const TerrainComparisonOverlay: React.FC = () => {
    const { terrainComparisonRequest, clearTerrainComparisonRequest } = useChat();
    const toast = useToast();

    const [comparisonSamples, setComparisonSamples] = useState<any[]>([]);
    const [showPopup, setShowPopup] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!terrainComparisonRequest || terrainComparisonRequest.length < 2) return;

        const run = async () => {
            setIsLoading(true);
            toast({
                title: "Building terrain maps…",
                description: `Fetching gene expression terrains for ${terrainComparisonRequest.length} cohorts`,
                status: "info",
                duration: 3000,
                isClosable: true,
                position: "top-right",
            });

            try {
                const results = await Promise.all(
                    terrainComparisonRequest.map(async (cohort) => {
                        // Resolve the Dataset object from the cohort's dataset ID (e.g. "GBM").
                        // fetchGeneExpressionData gracefully falls back to random points if
                        // the layout/expression API is unavailable, so null is safe here.
                        const dataset = await fetchDatasetById(cohort.dataset).catch(() => null);
                        const points = await fetchGeneExpressionData(
                            cohort.sample_ids,
                            dataset as any
                        );
                        return {
                            name: cohort.label,
                            datasetName: `${cohort.dataset} — n=${cohort.sample_count}`,
                            points,
                            sampleIds: cohort.sample_ids,
                        };
                    })
                );
                setComparisonSamples(results);
                setShowPopup(true);
            } catch (err) {
                console.error("Terrain comparison failed:", err);
                toast({
                    title: "Terrain comparison failed",
                    description: "Could not fetch gene expression data for one or more cohorts.",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                    position: "top-right",
                });
            } finally {
                setIsLoading(false);
                clearTerrainComparisonRequest();
            }
        };

        run();
    }, [terrainComparisonRequest]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            {/* Full-screen loading overlay */}
            {isLoading && (
                <Box
                    position="fixed"
                    top={0} left={0} right={0} bottom={0}
                    bg="blackAlpha.600"
                    zIndex={2000}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexDirection="column"
                    gap={4}
                >
                    <Spinner size="xl" color="green.400" thickness="4px" speed="0.8s" />
                    <Text color="white" fontWeight="semibold" fontSize="lg">
                        Building terrain maps…
                    </Text>
                    <Text color="whiteAlpha.800" fontSize="sm">
                        Averaging gene expression across cohort samples
                    </Text>
                </Box>
            )}

            {/* Side-by-side terrain comparison popup */}
            {showPopup && comparisonSamples.length >= 2 && (
                <ComparisonPopup
                    samples={comparisonSamples}
                    onClose={() => {
                        setShowPopup(false);
                        setComparisonSamples([]);
                    }}
                />
            )}
        </>
    );
};

export default TerrainComparisonOverlay;
