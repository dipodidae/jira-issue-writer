# Progress Log

## 2025-10-15

- Hardened `server/api/prompt.ts` OpenAI handling to normalize different message payload shapes (plain text arrays, tool calls) and improved sanitization to avoid "Empty response from OpenAI" errors.
- Added temporary debug logging (guarded outside production) around payload extraction and JSON parsing in `server/api/prompt.ts` to capture raw/cleaned previews during tests.
- Escaped control characters within JSON string values in `server/api/prompt.ts` so unescaped newlines from the model no longer break JSON parsing.
- Next step: retest `/api/prompt` endpoint to confirm responses are now parsed into valid Jira JSON.

## 2025-10-16

- Extended `/api/prompt` with a sufficiency pre-check that returns `needs_info` prompts and enforces a three-round clarification cap.
- Updated shared types and `FormPrompt.vue` to carry clarification state, surface new toast messaging, and launch a follow-up modal when the model needs more data.
- Added `ModalClarificationPrompt` component and trimmed `ModalJiraTask` to display only the finalized Jira task payload.
- Instrumented the sufficiency flow with detailed debug logs and an empty-response fallback so we can capture console data when the model misbehaves.
- Crafted a smarter fallback clarification question that now uses the model to draft a targeted follow-up (with a deterministic backup when generation fails) referencing user notes and selected scopes.
- Restored the prompt handler safeguards so clarification context feeds into sufficiency checks, responses recover from tool-call payloads, and the server enforces the three-round clarification cap again.
- Next step: exercise the UI through an initial request, a clarification cycle, and the final Jira task to confirm the loop behaves as expected.

- Guided the assistant to classify output into one of ten Jira issue types, enforcing type-specific description templates and returning the chosen `issueType` alongside the title/description payload.
- Added `IssueTypeBadge` and modal wiring so the generated task highlights its type with color-coded labeling in the UI.
- Next step: run end-to-end generation checks to confirm each template renders correctly and the label maps to the expected color.

- Centralized issue-type metadata (labels, templates, aliases, colors) in `shared/constants/issue-types.ts` and rewired the API prompt plus UI badge to source everything from that single map.
- Next step: extend UI components to surface issue-type-specific helpers (e.g., default checklists) using the shared metadata.

- Introduced `MarkdownContentPreview` component to render generated Jira descriptions via Nuxt Content's `ContentRenderer`, keeping copy-to-clipboard support while replacing the textarea view in `ModalJiraTask`.
- Next step: style-check markdown rendering with longer templates to ensure scroll bounds and typography feel consistent with the rest of the UI.

- Added a guided description to the Issue Context field so screen readers announce the prompt expectations and the Nuxt UI form wiring can emit a valid `aria-describedby` target.
- Populated `AppHeader` with explicit navigation metadata, preventing the undefined `items` warning and linking directly to the README and GitHub repository.
- Next step: reload the app with devtools open to confirm the accessibility warnings no longer appear.

- Extracted OpenAI prompt bodies into markdown templates under `server/prompts/`, enabling easier editing with IDE highlighting while keeping runtime interpolation via helper functions.
- Next step: consider unit tests around template rendering to catch missing placeholders when prompt contracts evolve.

- Expanded `server/prompts/system.ts` with richer domain guidance (financial sensitivity, scope rules, multi-item handling) and an explicit JSON schema (priority, severity, labels, components, dependencies, estimate, riskAreas, dataSensitivity, acceptanceCriteria array, multiItem). Added illustrative examples for `enough` vs `not_enough` paths and stricter output constraints (no speculation, humor only in clarification path).
- Added `IssueGenerationResult` types to `shared/types/api.ts` (split into Enough vs NotEnough variants) to support migration from legacy `PromptResponse` while allowing optional fields under the clarification path.
- Next step: adapt server parsing logic to prefer the enhanced schema when present, validate via a runtime guard (e.g., Zod) and surface new metadata (labels/components/riskAreas) in the UI.
- Integrated enhanced schema parsing in `server/api/prompt.ts` with a lightweight validator (`parseIssueGenerationResult`) and fallback to legacy fields; preserved clarification flow compatibility.
- Added enriched field rendering (priority, severity, labels, components, riskAreas, dataSensitivity, estimate, acceptanceCriteria) to `ModalJiraTask.vue` with defensive checks.
- Next step: propagate enriched fields fully to client state (currently only minimal fields returned in API response), add dedicated endpoint or extend existing response shape; consider adding automated unit tests for validator edge cases.
- Propagated enriched fields through API response by extending `PromptResponse` and mapping enhanced schema fields in `handleJiraEnhanced`. Updated `FormPrompt.vue` to pass enriched data into `ModalJiraTask` so chips now populate when model supplies them.
