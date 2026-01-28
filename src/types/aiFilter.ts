// Types for AI-powered filter criteria

export interface AIFilterCriteria {
  types?: ('issue' | 'discussion')[];
  titleContains?: string[];
  authorIncludes?: string[];
  labelsIncludeAny?: string[];
  labelsExclude?: string[];
  hasLabels?: boolean;
  ageMinDays?: number;
  ageMaxDays?: number;
  isStale?: boolean;
}

export interface AIFilterResult {
  criteria: AIFilterCriteria;
  explanation: string;
  originalQuery: string;
}

export interface AIFilterState {
  isLoading: boolean;
  error: string | null;
  result: AIFilterResult | null;
}
