# Nuxt 4 TypeScript Project

This is a modern web application built with Nuxt 4, Nuxt UI, Pinia, TypeScript, and Vue 3 Composition API.

## Core Requirements

The end goal is stability, speed, and great user experience.

## Project Structure

- `app/` - Application code (app.vue, components/, composables/, stores/, pages/)
- `shared/` - Code shared between client/server
- `server/` - Server-side code
- `public/` - Static assets

## Code Quality Requirements

- Follow standard TypeScript conventions and best practices
- Use `<script setup lang="ts">` and Composition API when creating Vue components
- Use clear, descriptive variable and function names
- Add comments only to explain complex logic or non-obvious implementations
- Keep functions focused and manageable (generally under 50 lines), extract complex logic into separate domain-specific files
- Remove code that is not used or needed
- Use error handling patterns consistently
- Always use Nuxt UI components for UI elements, favoring them over other libraries or custom components unless there is a strong reason otherwise
- Use auto-imported components and composables wherever possible to maintain clean and consistent code
- Favor tiny, focused components—especially inside loops—so logic lives in the script of a subcomponent, not buried in complex template expressions.

## Key Points

- Components in `app/components/` are auto-imported
- Composables in `app/composables/` are auto-imported
- Create and maintain PROGRESS.md file to track ongoing work and issues
- Keep application-specific code in the app/ folder
- Type Organization: All shared/project-wide TypeScript types live under `/types` (command.ts, stream.ts, store.ts, api.ts, index.ts, global.d.ts). Do NOT redefine large shared interfaces inline in components/composables—only keep tiny component-local helper types adjacent.
