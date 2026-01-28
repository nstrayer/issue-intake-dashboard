# Triage Sidekick - Design Notes

**Date:** 2026-01-26

## The "Why"

### What This Tool Is
A **command center** for issue intake rotation. The place you sit down to see what needs processing and work toward intake-zero.

### The Core Experience
**Clarity on open.** You launch the tool and immediately see:
- How many items need processing (issues + discussions unified)
- Which ones are urgent (stale, high-severity)
- Your progress toward intake-zero

No waiting. No parsing. No scrolling through chat output.

### What "Intake-Zero" Means
No radio silence. Every issue/discussion has been acknowledged, and is ready for the next stage (assignment by appropriate people). The reporter doesn't feel ignored.

### Why Not GitHub / CLI
- **GitHub**: Dumb infrastructure. Issues and discussions are separate. No AI. No workflow awareness of what "handled" means.
- **CLI**: Serial, text-based. Info scrolls away, gets re-dumped as ASCII tables. No persistent visual state.

### Where Claude Fits
Claude is a **per-item tool**, not the primary interface:
- Base data comes directly from GitHub (fast, reliable)
- Claude can enrich the view with insights (duplicate detection, label suggestions) in the background
- When you select an item, Claude provides analysis, finds duplicates, suggests labels, and drafts responses

The command center is the **container**. Claude is the **tool** you use inside it.

---

## Design Principles

1. **Command center first**: Visual overview is primary, always visible
2. **Immediate load**: Data from GitHub, no Claude dependency for initial view
3. **Unified queue**: Issues + Discussions together (GitHub separates them)
4. **Side panel for focus**: Work on one item without losing queue context
5. **AI as augmentation**: Claude enriches and assists, doesn't drive the interface
6. **Low-risk one-click**: Labels and status can be applied directly; high-risk actions (close, comment) go through GitHub

---

## Architecture

### Data Flow
```
Current:  Claude fetches data → parse markdown output → display (slow, fragile)
Proposed: GitHub API/CLI → structured JSON → display → Claude enriches (fast, reliable)
```

### Three Layers
1. **Immediate** - Fetch from GitHub, render command center (no AI wait)
2. **Background enrich** - Claude scans queue, adds insights as annotations
3. **On-demand** - User selects item, Claude provides deep analysis + draft response

---

## UI Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER: Progress toward intake-zero (X remaining)           [🔄 Refresh]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────┬───────────────────────────────────┐│
│  │  QUEUE LIST                         │  SIDE PANEL (selected item)      ││
│  │  ────────────                       │  ───────────────────────         ││
│  │  Issues + Discussions unified       │  Full issue/discussion details   ││
│  │  Sorted by urgency                  │  Claude's analysis:              ││
│  │  Visual indicators (age, labels)    │  - Suggested labels              ││
│  │  Click to select                    │  - Duplicate detection           ││
│  │                                     │  - Draft response                ││
│  │  [Filters: Status, Area, Age]       │                                  ││
│  │                                     │  [Apply Label] [Copy Response]   ││
│  └─────────────────────────────────────┴───────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key UI Elements
- **Progress indicator**: How many items remain vs. handled
- **Unified queue**: Issues and discussions in one list
- **Age/urgency signals**: Visual encoding for stale items
- **Side panel**: Details + Claude analysis for selected item
- **Draft response**: Claude suggests response text when user is blocked

---

## Claude's Capabilities (Per-Item)

When a user selects an issue/discussion, Claude can:
1. **Find duplicates**: Scan for similar issues, link them
2. **Suggest labels**: Recommend area:*, type (bug/enhancement), etc.
3. **Draft response**: Provide starting text when user is stuck on what to say
4. **Analyze context**: Summarize the issue, identify key information

---

## Action Model

| Action | Risk | UX |
|--------|------|-----|
| Add label | Low | One-click in side panel |
| Set status | Low | Dropdown in side panel |
| Mark duplicate | Low | Link suggestion, one-click apply |
| Close issue | High | Must go through GitHub |
| Post comment | High | Draft in panel, copy to GitHub |
| Assign user | High | Must go through GitHub |

---

## Open Questions

- How to surface "intake-zero progress" visually (count? percentage? progress bar?)
- Should Claude's background enrichment run automatically or on-demand?
- What defines "stale" (14 days? 30 days? configurable?)
- Response draft flow: copy to clipboard → paste in GitHub? Or deeper integration?

---

## Implementation Steps

1. **Create `/api/issues` endpoint**
   - Run `gh issue list` and `gh api` for discussions directly
   - Return structured JSON (no Claude parsing)

2. **Build command center view**
   - Unified queue list (issues + discussions)
   - Progress indicator toward intake-zero
   - Visual urgency indicators

3. **Add side panel**
   - Show full item details
   - Placeholder for Claude analysis

4. **Integrate Claude per-item**
   - On item select, request analysis
   - Display suggestions, draft responses

5. **Implement one-click actions**
   - Label picker, status dropdown
   - Apply Claude's suggestions

6. **Background enrichment (optional)**
   - Claude scans visible queue
   - Adds duplicate/label badges to list view
