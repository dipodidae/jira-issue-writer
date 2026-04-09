# Jira Ticket Writer

AI-powered Nuxt 4 app that turns messy problem descriptions into structured, ready-to-file Jira issues through a conversational interface.

Paste a bug report, feature idea, or half-formed thought. The AI asks clarifying questions if needed, then generates a complete ticket with title, description, priority, acceptance criteria, and all the metadata Jira expects.

## Features

- **Conversational drafting** -- describe the issue in plain language, answer follow-up questions, refine the result
- **Smart split suggestions** -- detects when a request should be multiple tickets and proposes a breakdown
- **Rich metadata** -- priority, severity, labels, components, risk areas, estimates, acceptance criteria
- **Scope tagging** -- focus generation on frontend, backend, infra, or other areas
- **Multi-session** -- work on several drafts in parallel, each with its own conversation history
- **Pinned context** -- attach error logs or specs that get sent as background context with every message
- **Quick-start templates** -- one-click starters for bugs, features, tech debt, and spikes
- **Copy anything** -- copy title, description, or full formatted ticket to clipboard
- **Persistent state** -- conversations and preferences survive page reloads via localStorage
- **PWA** -- installable as a standalone app

## Tech Stack

Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Nuxt UI, Pinia, OpenAI SDK, Zod, Vite PWA

## Getting Started

```bash
pnpm install
cp .env.example .env   # add your OpenAI API key
pnpm dev
```

Open `http://localhost:3000`.

### Environment Variables

| Variable              | Description                                                           |
| --------------------- | --------------------------------------------------------------------- |
| `NUXT_OPENAI_API_KEY` | OpenAI API key ([get one here](https://platform.openai.com/api-keys)) |

### Scripts

| Command        | Description                      |
| -------------- | -------------------------------- |
| `pnpm dev`     | Start dev server                 |
| `pnpm dev:pwa` | Dev server with PWA enabled      |
| `pnpm build`   | Production build                 |
| `pnpm preview` | Preview production build locally |

## API Routes

| Route         | Method | Description                                                                           |
| ------------- | ------ | ------------------------------------------------------------------------------------- |
| `/api/prompt` | POST   | Main AI generation endpoint -- accepts text, scope, stage, and optional current draft |
| `/api/agents` | GET    | Returns available AI models filtered by tier                                          |

## Project Structure

```
app/
  pages/           Single-page app (index.vue)
  components/      Chat thread, draft cards, sidebar, modals
  composables/     useConversation, usePromptSubmission, useDraftInput
  stores/          Pinia stores (conversation sessions, preferences)
  constants/       Issue types, scopes, stage definitions

server/
  api/             Nitro API routes (prompt, agents)
  prompts/         Markdown prompt templates with placeholder tokens
  utils/           JSON sanitizer and helpers

shared/
  types/           Shared TypeScript types for API contracts
```

## Customization

**Prompts** -- edit the markdown files in `server/prompts/`. Keep `{{CONTEXT}}` and other placeholder tokens intact.

**Models** -- default model is set in `server/api/prompt.ts`. Available models per tier are configured in `server/api/agents.ts`.

**Scopes** -- add or edit scope tags in `app/constants/scopes.ts`.

**Issue types** -- modify types and their colors in `app/constants/issue-types.ts`.

## Deployment

Built for Vercel out of the box (Nitro preset). Push to `main` and it deploys. Also includes a Dockerfile for container-based hosting.
