// Minimal component for 3-4 line summary

import React, { useState, useEffect } from "react";
import { Alert, AlertIcon, AlertDescription, Spinner } from "@chakra-ui/react";
import theme from "../../theme";

interface SampleSummaryComponentProps {
  samples: any[];
  datasetName: string;
  visualizeTrigger: number;
}

export const SampleSummaryComponent: React.FC<SampleSummaryComponentProps> = ({
  samples,
  datasetName,
  visualizeTrigger,
}) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateSummary = async () => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey || !samples || samples.length === 0) return;
    setIsLoading(true);

    try {
      const sampleData = samples
        .map((sample) => {
          const sampleId = sample.sampleid || sample.sample_id || sample.id;
          const keyFields = [
            "age",
            "gender",
            "subtype",
            "grade",
            "idh_status",
            "mgmt_status",
          ];
          const clinical = keyFields
            .map((field) => sample[field])
            .filter((value) => value !== undefined && value !== null)
            .join(", ");
          return `Sample ${sampleId}: ${clinical || "No clinical data"}`;
        })
        .join("\n");

      const prompt = `\nGiven the following clinical sample data, provide ONLY the most useful, concise insights in 3-4 sentences.\nDo NOT include any disclaimers, preambles, or mention that you are an AI. Only output the insights.\n\nDataset: ${datasetName}\nSamples: ${samples.length}\nSample Data:\n${sampleData}\n`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo", // Use the faster model
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 150,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) setSummary(content.trim());
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (samples && samples.length > 0) {
      generateSummary();
    }
  }, [samples, datasetName, visualizeTrigger]);

  if (!samples || samples.length === 0) {
    return null;
  }

  return (
    <Alert
      mb={4}
      borderRadius="md"
      bg={`${theme.colors?.geneTerrain?.accent1}10`}
      color="geneTerrain.textPrimary"
      borderLeftWidth="4px"
      borderLeftColor="geneTerrain.accent1"
    >
      <AlertIcon color="geneTerrain.accent1" />
      <AlertDescription>
        {isLoading ? (
          <>
            <Spinner size="sm" mr={2} />
            Analyzing samples...
          </>
        ) : summary ? (
          summary
        ) : (
          "Multiple samples selected. Visualizing the average gene expression values across selected samples."
        )}
      </AlertDescription>
    </Alert>
  );
};
