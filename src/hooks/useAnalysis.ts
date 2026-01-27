import { useState, useCallback } from 'react';
import { ClaudeAnalysis, QueueItem } from '../types/intake';

export function useAnalysis() {
  const [analysis, setAnalysis] = useState<ClaudeAnalysis | null>(null);

  const analyzeItem = useCallback(async (item: QueueItem, body: string) => {
    setAnalysis({
      suggestedLabels: [],
      duplicates: [],
      summary: '',
      isLoading: true
    });

    try {
      // Get Claude's analysis
      const analysisResponse = await fetch(`/api/issues/${item.number}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          body: body,
          labels: item.labels,
        }),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || 'Analysis request failed');
      }

      const analysisData = await analysisResponse.json();

      // Search for duplicates using Claude's suggested terms
      let duplicates: ClaudeAnalysis['duplicates'] = [];
      if (analysisData.duplicateSearchTerms?.length > 0) {
        const dupResponse = await fetch('/api/issues/search-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchTerms: analysisData.duplicateSearchTerms,
            excludeNumber: item.number,
          }),
        });

        if (dupResponse.ok) {
          const dupData = await dupResponse.json();
          duplicates = dupData.duplicates.map((d: { number: number; title: string; url: string }) => ({
            number: d.number,
            title: d.title,
            url: d.url,
            similarity: 0.7, // Placeholder - could calculate actual similarity
          }));
        }
      }

      setAnalysis({
        suggestedLabels: analysisData.suggestedLabels || [],
        duplicates,
        summary: analysisData.summary || '',
        draftResponse: analysisData.draftResponse,
        isLoading: false,
      });
    } catch (error) {
      setAnalysis({
        suggestedLabels: [],
        duplicates: [],
        summary: '',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      });
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
  }, []);

  return { analysis, analyzeItem, clearAnalysis };
}
