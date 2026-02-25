import { useState, useCallback, useEffect } from 'react';
import { ClaudeAnalysis, QueueItem, FollowUpMessage } from '../types/intake';

export type AnalysisType = 'full' | 'duplicates' | 'labels' | 'response';

function getAnalysisLabel(type: AnalysisType): string {
  switch (type) {
    case 'full': return 'Full analysis';
    case 'duplicates': return 'Duplicate search';
    case 'labels': return 'Label suggestion';
    case 'response': return 'Response draft';
  }
}

function playNotificationSound(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Two-tone chime
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch {
    // Audio not available
  }
}

function notifyAnalysisComplete(success: boolean, type: AnalysisType): void {
  playNotificationSound();

  // Only show browser notification if tab is not focused
  if (!document.hidden) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const body = success
    ? `${getAnalysisLabel(type)} complete`
    : `${getAnalysisLabel(type)} failed`;

  const n = new Notification('Triage Sidekick', { body });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

export function useAnalysis() {
  const [analysis, setAnalysis] = useState<ClaudeAnalysis | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const analyzeItem = useCallback(async (item: QueueItem, body: string, type: AnalysisType = 'full') => {
    // For individual analysis types, preserve existing results
    const isFull = type === 'full';

    setAnalysis(prev => ({
      suggestedLabels: isFull ? [] : (prev?.suggestedLabels || []),
      duplicates: isFull ? [] : (prev?.duplicates || []),
      summary: isFull ? '' : (prev?.summary || ''),
      draftResponse: isFull ? undefined : prev?.draftResponse,
      isLoading: true,
      conversationHistory: isFull ? [] : (prev?.conversationHistory || []),
    }));

    try {
      // Get Claude's analysis
      const analysisResponse = await fetch(`/api/issues/${item.number}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          body: body,
          labels: item.labels,
          type,
        }),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || 'Analysis request failed');
      }

      const analysisData = await analysisResponse.json();

      // Search for duplicates using Claude's suggested terms (for full or duplicates type)
      let duplicates: ClaudeAnalysis['duplicates'] = [];
      if ((type === 'full' || type === 'duplicates') && analysisData.duplicateSearchTerms?.length > 0) {
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

      // Merge results additively for individual types
      setAnalysis(prev => ({
        suggestedLabels: type === 'labels' || type === 'full'
          ? (analysisData.suggestedLabels || [])
          : (prev?.suggestedLabels || []),
        duplicates: type === 'duplicates' || type === 'full'
          ? duplicates
          : (prev?.duplicates || []),
        summary: type === 'full'
          ? (analysisData.summary || '')
          : (prev?.summary || ''),
        draftResponse: type === 'response' || type === 'full'
          ? analysisData.draftResponse
          : prev?.draftResponse,
        isLoading: false,
        lastAnalysisType: type,
        conversationHistory: prev?.conversationHistory || [],
      }));
      notifyAnalysisComplete(true, type);
    } catch (error) {
      setAnalysis(prev => ({
        suggestedLabels: prev?.suggestedLabels || [],
        duplicates: prev?.duplicates || [],
        summary: prev?.summary || '',
        draftResponse: prev?.draftResponse,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        conversationHistory: prev?.conversationHistory || [],
      }));
      notifyAnalysisComplete(false, type);
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
