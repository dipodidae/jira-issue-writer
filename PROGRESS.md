# Vue 3 Migration Progress

This file tracks the incremental migration to Vue 3 Composition API + TypeScript.

## Legend

- [x] Done
- [ ] Pending
- [!] Blocked / needs decision

## Components

- [x] `MarkdownContentPreview.vue`
- [ ] (Add next component here)

## Stores

- [ ] (List Pinia stores migrated / to migrate)

## Composables

- [ ] `useIssueGeneration` (example placeholder)

## Decisions / Blockers

- [ ] Confirm approach for legacy markdown sanitization (library vs custom)
- [ ] Audit remaining components for any Vue 2 lifecycle usage

## Recent Fixes

- [x] **2025-10-20**: Fixed 500 errors on live by adding comprehensive error handling to `/api/prompt`
  - Added try-catch around OpenAI API calls with specific error codes (401, 429, 400, 503)
  - Added request body validation
  - Added fallback error handling for unexpected errors
  - Improved logging for debugging production issues
  - Created `DEPLOYMENT_CHECKLIST.md` for troubleshooting

- [x] **2026-01-28**: Allow "I don't know" when asked for steps to reproduce
  - Clarification modal adds a one-click "I don't know" response
  - System prompt allows bugs with explicitly-unknown repro steps (fills Steps to Reproduce with "Unknown" + next diagnostics)

## Next Up

1. Identify next 3 components to migrate (small surface area first).
2. Extract shared logic from migrated components into composables.
3. Introduce unit tests for new composables.

Update this file in each PR.
