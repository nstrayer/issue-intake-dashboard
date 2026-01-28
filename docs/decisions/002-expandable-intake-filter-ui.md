# Decision: Expandable Intake Filter UI

**Date:** 2026-01-27
**Status:** Implemented

## Context

The dashboard fetches "unhandled" items from GitHub using server-side filters to exclude already-triaged items. Users couldn't see what filters were being applied or override them to verify the system was working correctly.

## Decision

Add an expandable "Intake Criteria" panel that:
1. Shows the current server-side filter criteria
2. Allows users to toggle individual filters on/off
3. Triggers a re-fetch when filters change
4. Highlights when non-default filters are active

## Intake Filter Options

**For Issues:**
- `excludeBacklogProject` - Hide items in "Positron Backlog" project
- `excludeMilestoned` - Hide items assigned to a milestone
- `excludeTriagedLabels` - Hide items with duplicate/wontfix/invalid labels
- `excludeStatusSet` - Hide items with Status field set in Positron project

**For Discussions:**
- `excludeAnswered` - Hide discussions that have been answered

## Changes Made

### Server (`server/github.ts`, `server/index.ts`)
- Added `IntakeFilterOptions` interface with boolean flags for each filter
- Added `DEFAULT_INTAKE_FILTERS` constant (all filters enabled)
- Updated `fetchIntakeQueue` to accept filter options parameter
- Updated API endpoint to parse filter options from query parameters
- Response now includes `activeFilters` showing which filters were applied

### Frontend (`src/hooks/useIntakeQueue.ts`)
- Added `IntakeFilterOptions` type (mirrors server)
- Hook now accepts filter options parameter
- Builds query string from filter options when fetching

### UI (`src/components/QueueList/QueueList.tsx`, `src/App.tsx`)
- Added "Intake Criteria" expandable button in filter bar
- Expandable panel shows all filter options with checkboxes
- Filters grouped by type (Issues vs Discussions)
- "Reset to defaults" button when custom filters are active
- Button highlights when any filter differs from defaults

## Trade-offs

**Pros:**
- Users can verify the system is fetching correctly
- Advanced users can customize what they see
- Transparent about how "unhandled" is defined
- Easy to reset to default behavior

**Cons:**
- Adds complexity to the UI
- Changing filters triggers new API call (could be slow)
- Users might accidentally show too many items

## Alternatives Considered

1. **Read-only display** - Just show filters, no editing. Less useful for verification.
2. **URL-based filters** - Put filters in URL for shareable views. Adds complexity.
3. **Presets** - Named filter configurations. Over-engineered for current needs.

## Revision Notes

Future enhancements could include:
- Saving filter preferences to localStorage
- Adding more filter criteria (e.g., by label, by author)
- Showing count impact before applying filters
