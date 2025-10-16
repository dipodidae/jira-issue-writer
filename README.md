# Jira Issue Writer

Ultra-light Nuxt 4 + TypeScript app that turns raw problem text and selected scope tags into concise, actionable Jira issue JSON (title + description) using OpenAI models.

## Customize

Prompts: Edit markdown files in `server/prompts/` (system, issue, clarification). Keep placeholder tokens like `{{CONTEXT}}` intact.
Model: Change default in `server/api/prompt.ts` (`model = body.agent ?? 'gpt-4o-mini'`).
Scopes: Update descriptions in `shared/constants/scopes.ts`.
Issue types: Edit guide and values in `shared/constants/issue-types.ts`.
API key: Set `NUXT_OPENAI_API_KEY` or `runtimeConfig.openaiApiKey`.
