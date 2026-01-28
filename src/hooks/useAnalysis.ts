import { useState, useCallback } from 'react';
import { ClaudeAnalysis, QueueItem, FollowUpMessage } from '../types/intake';

export function useAnalysis() {
  const [analysis, setAnalysis] = useState<ClaudeAnalysis | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const analyzeItem = useCallback(async (item: QueueItem, body: string) => {
    setAnalysis({
      suggestedLabels: [],
      duplicates: [],
      summary: '',
      isLoading: true,
      conversationHistory: [],
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
        conversationHistory: [],
      });
    } catch (error) {
      setAnalysis({
        suggestedLabels: [],
        duplicates: [],
        summary: '',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        conversationHistory: [],
      });
    }
  }, []);

  const sendFollowUp = useCallback(async (question: string, item: QueueItem, body: string) => {
    if (!analysis || analysis.isLoading || followUpLoading) return;

    const userMessage: FollowUpMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    // Optimistically add user message
    setAnalysis(prev => prev ? {
      ...prev,
      conversationHistory: [...(prev.conversationHistory || []), userMessage],
    } : null);

    setFollowUpLoading(true);

    try {
      const response = await fetch(`/api/issues/${item.number}/analyze/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          issue: {
            title: item.title,
            body: body,
          },
          analysis: {
            summary: analysis.summary,
            suggestedLabels: analysis.suggestedLabels,
            draftResponse: analysis.draftResponse,
          },
          conversationHistory: (analysis.conversationHistory || []).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Follow-up request failed');
      }

      const data = await response.json();

      const assistantMessage: FollowUpMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setAnalysis(prev => prev ? {
        ...prev,
        conversationHistory: [...(prev.conversationHistory || []), assistantMessage],
      } : null);
    } catch (error) {
      // Remove the optimistic user message on error and show error
      setAnalysis(prev => prev ? {
        ...prev,
        conversationHistory: (prev.conversationHistory || []).filter(m => m.id !== userMessage.id),
        error: error instanceof Error ? error.message : 'Follow-up failed',
      } : null);
    } finally {
      setFollowUpLoading(false);
    }
  }, [analysis, followUpLoading]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setFollowUpLoading(false);
  }, []);

  return { analysis, analyzeItem, clearAnalysis, sendFollowUp, followUpLoading };
}
