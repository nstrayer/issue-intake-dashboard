# Decision: Separate Issues and Discussions into Two Panels

**Date:** 2026-01-27
**Status:** Implemented

## Context

The original UI displayed issues and discussions in a single list, differentiated only by color-coded dots (green for issues, blue for discussions). This made it difficult to quickly distinguish between the two types of items and focus on one category at a time.

## Decision

Restructure the left panel into two vertically stacked sections:
1. **Issues panel** (top) - Displays all GitHub issues
2. **Discussions panel** (bottom) - Displays all GitHub discussions

Each panel has:
- A collapsible header with type indicator (colored dot), title, and count (filtered/total)
- Independent scrolling within each panel
- Shared search and filter controls at the top

## Changes Made

- Removed `type` filter from `QueueFilters` interface (no longer needed since types are now separated)
- Removed "By type" sort option (redundant with split panels)
- Added collapsible `TypePanel` component for each item type
- Each panel shows `filtered/total` count in header
- Panels share 50/50 flex space when both expanded; collapsed panels shrink

## Trade-offs

**Pros:**
- Clear visual separation between issues and discussions
- Easier to focus on one type at a time
- Collapsible panels allow focusing on either type
- Count indicators show filtered vs total for each type

**Cons:**
- Less vertical space per item type when both panels are expanded
- Removed ability to see a mixed list sorted by date across both types

## Alternatives Considered

1. **Side-by-side panels** - Would require more horizontal space, reducing room for the detail panel
2. **Tabbed interface** - Would hide one type completely, reducing context
3. **Collapsible sections in single list** - Similar result but less clear visual hierarchy

## Revision Notes

If users frequently need to see both types in a single chronological list, consider:
- Adding a "Combined view" toggle
- Implementing drag-to-resize panel heights
