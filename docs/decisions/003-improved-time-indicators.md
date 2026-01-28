# Decision: Improved Time Indicators for Same-Day Items

**Date:** 2026-01-27
**Status:** Implemented

## Context

Time indicators were showing "0d" for items created on the same day, which wasn't very informative. Users wanted to see more granular timing for recent items, like "3h ago" instead of "0d".

## Decision

Improve time indicators to show hours for same-day items:
- Items less than 1 hour old: `<1h`
- Items from today: `3h`, `12h`, etc.
- Items 1+ days old: `1d`, `5d`, etc. (unchanged)

For verbose displays (SidePanel), use natural language:
- `less than an hour ago`
- `3 hours ago`
- `5 days ago`

## Changes Made

### Types (`src/types/intake.ts`)
- Added `ageInHours` field to `QueueItem` interface
- Added `formatAge(ageInDays, ageInHours)` helper for compact display
- Added `formatAgeVerbose(ageInDays, ageInHours)` helper for verbose display

### Hook (`src/hooks/useIntakeQueue.ts`)
- Updated `calculateAge` to compute and return `ageInHours`
- Added `ageInHours` to transformed queue items

### Components
- `QueueList.tsx`: Uses `formatAge()` for compact time display
- `SidePanel.tsx`: Uses `formatAgeVerbose()` for detailed time display

## Trade-offs

**Pros:**
- More useful information for recent items
- Natural language reads better in detail view
- Consistent formatting throughout the app

**Cons:**
- Slightly more complex age calculation
- Time can drift if page is open for hours without refresh (existing behavior)

## Alternatives Considered

1. **Relative time with auto-refresh** - Auto-update every minute. Adds complexity and potential performance concerns.
2. **Full timestamps** - Show exact date/time. Too verbose for the list view.
3. **Minutes granularity** - Show minutes for items < 1 hour. Diminishing returns; 1-hour granularity is sufficient.

## Examples

| Age | Compact | Verbose |
|-----|---------|---------|
| 30 minutes | `<1h` | less than an hour ago |
| 3 hours | `3h` | 3 hours ago |
| 1 day | `1d` | 1 day ago |
| 5 days | `5d` | 5 days ago |
