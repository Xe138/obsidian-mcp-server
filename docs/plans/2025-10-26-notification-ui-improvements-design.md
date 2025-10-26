# Notification UI Improvements Design

**Date:** 2025-10-26
**Status:** Approved for implementation

## Overview

Improve the MCP plugin's notification system to address three key UX issues:
1. Unclear notification message format
2. Settings section collapsing when toggling notifications on/off
3. Broken filter controls in notification history modal

## Problem Statement

### Issue 1: Notification Message Clarity
Current format: `🔧 MCP: tool_name({ params })`
- Not immediately clear this is a tool call
- Parameters on same line make long notifications hard to read
- "MCP:" prefix is too terse

### Issue 2: Settings Section Collapse
When toggling "Enable notifications" on/off:
- The entire settings page re-renders via `this.display()`
- This collapses the "UI Notifications" detail section
- Poor UX - user loses their place in settings

### Issue 3: Modal Filter Bugs
In the notification history modal:
- Tool filter input box doesn't accept text input
- Success/Error dropdown doesn't show selected option visually
- Root cause: `applyFilters()` calls `this.onOpen()` which destroys/recreates all DOM elements

## Design Decisions

### 1. Notification Message Format

**Chosen approach:** Multi-line format with explicit "MCP Tool Called" label

**Format:**
```
📖 MCP Tool Called: read_note
path: "daily/2025-01-15.md"
```

**Rationale:**
- First line clearly identifies this as an MCP tool call
- Tool name prominently displayed
- Parameters on separate line improve readability
- Works within Obsidian's Notice component (supports newlines)

**Implementation:**
- Modify `NotificationManager.formatArgs()` to return parameter string without wrapping parens
- Update message construction: `${icon} MCP Tool Called: ${toolName}\n${argsStr}`
- When `showParameters` is false: `${icon} MCP Tool Called: ${toolName}` (no newline)
- Maintain existing truncation: 30 chars for parameter values, 50 for JSON fallback

### 2. Settings Section - Prevent Collapse

**Chosen approach:** Targeted subsection update

**Strategy:**
- Store reference to notification detail element during initial render
- Create helper method to update only notification section content
- Preserve `open` state of detail element
- Avoid full page re-render on toggle

**Implementation:**
1. Add instance variable: `private notificationDetailsEl: HTMLDetailsElement | null = null`
2. Store reference when creating notification section in `display()`
3. Create `updateNotificationSection()` method:
   - Clear content of detail element (not the element itself)
   - Rebuild child settings
   - Preserve `open` attribute
4. Replace `this.display()` in toggle handler with targeted update

**Benefits:**
- Better UX - maintains user context
- More efficient - doesn't re-render entire page
- Extensible pattern for other collapsible sections

### 3. Modal Filter Controls

**Chosen approach:** Use Obsidian Setting components + eliminate re-render on filter

**Current problems:**
- Raw HTML elements (`createEl('input')`, `createEl('select')`)
- `applyFilters()` → `onOpen()` → `contentEl.empty()` destroys all DOM
- Loses focus, input values, selected states

**Solution:**
1. Use Obsidian `Setting` component for filter controls
2. Filter state already stored in instance variables (`filterTool`, `filterType`)
3. Refactor update logic:
   - `createFilters()` - builds filters once using Setting components
   - `updateHistoryList()` - updates only list container with filtered results
   - `updateResultsCount()` - updates only count element
4. Store references to list container and count element
5. `applyFilters()` calls targeted update methods, NOT `onOpen()`

**Benefits:**
- Setting components properly handle input/select state
- No DOM destruction during filtering
- Consistent with Obsidian UI patterns
- Better performance - only updates what changed

## Files to Modify

### src/ui/notifications.ts
- Update `showToolCall()` message format
- Modify `formatArgs()` to return unwrapped parameter string

### src/settings.ts
- Add `notificationDetailsEl` instance variable
- Store reference in `display()` when creating notification section
- Create `updateNotificationSection()` helper method
- Replace `this.display()` call in toggle handler

### src/ui/notification-history.ts
- Add instance variables for DOM references:
  - `listContainerEl: HTMLElement | null`
  - `countEl: HTMLElement | null`
- Refactor `createFilters()` to use Setting components
- Create `updateHistoryList()` method
- Create `updateResultsCount()` method
- Update `applyFilters()` to call targeted update methods

## Success Criteria

1. Notifications display with clear "MCP Tool Called:" label and multi-line format
2. Toggling "Enable notifications" keeps the UI Notifications section open
3. Tool filter input accepts text and filters list in real-time
4. Success/Error dropdown shows selected option and filters correctly
5. No regressions in existing notification functionality

## Testing Plan

1. **Notification format:**
   - Enable notifications with parameters shown
   - Trigger various MCP tools (read_note, search, etc.)
   - Verify multi-line format with "MCP Tool Called:" label
   - Test with parameters disabled - should show single line

2. **Settings collapse:**
   - Open UI Notifications section
   - Toggle "Enable notifications" off
   - Verify section remains open
   - Toggle back on, verify section still open

3. **Modal filters:**
   - Open notification history modal
   - Type in tool filter box - verify text appears and list filters
   - Select different options in Success/Error dropdown - verify selection shows and list filters
   - Test combinations of filters
   - Verify results count updates correctly

## Future Enhancements (Out of Scope)

- Notification batching/grouping for rapid tool calls
- Clickable notifications that open relevant notes
- Export history to note file (not just clipboard)
- Filter by date/time range in history modal
