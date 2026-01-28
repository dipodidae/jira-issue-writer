# Vue 3 Migration Guide

## 1. Purpose & Audience

This guide documents the application-specific migration from legacy Vue 2 / Options API patterns to Vue 3 with the Composition API and TypeScript inside this codebase. It is written for contributors who are already familiar with general web development, Git, environments (local/acceptance/production), and our existing delivery workflow. It intentionally omits platform-agnostic infrastructure concepts (Kubernetes, monitoring, DR, generic security) unless the migration requires a code change.

If you need broader infrastructure details, refer to the platform / ops docs in Confluence, not this guide.

## 2. Scope (What _is_ covered)

Included topics are only those required for:

- Incrementally converting components to `<script setup lang="ts">` and Composition API.
- Refactoring shared logic into composables under `app/composables/`.
- Updating state management to Pinia (removing Vuex patterns if still present).
- Adjusting build / lint / type configs impacted by Vue 3.
- Handling markdown rendering & other component level changes (e.g. replacing deprecated APIs).
- Testing & verification strategies specific to the migration.

Out of scope (removed from earlier draft): generic environment explanations, branching model, Terraform snippets, YAML infra manifests, blue/green deployments, Prometheus, unrelated performance tuning, disaster recovery, Dockerfiles, ConfigMaps, Secrets, alerting, security hardening not triggered by a code change.

## 3. Migration Principles

1. **Small, reviewable PRs** – Convert a limited set of components at a time.
2. **Preserve behavior** – Don’t introduce UX changes unless explicitly part of a task.
3. **Type safety first** – Add or tighten types while migrating; prefer explicit interfaces in `/types`.
4. **Remove dead code** – Delete obsolete helpers/components rather than leaving TODOs.
5. **Leverage auto-imports** – Keep migrated component scripts clean (avoid redundant imports already auto-imported by Nuxt).
6. **Isolate side effects** – Move fetch / async logic from templates into composables or server APIs.

## 4. Component Migration Checklist

For each Vue 2 / Options pattern component you migrate:

- Replace `export default { ... }` with `<script setup lang="ts">`.
- Move data, computed, methods into `const` variables / `computed` / functions.
- Replace `this.` references with direct variable references.
- Convert mixins to composables (create a new file in `app/composables/` if reused).
- Ensure props have explicit TypeScript interfaces or inline generics via `defineProps<T>()`.
- Replace deprecated lifecycle hooks (`beforeDestroy` -> `onBeforeUnmount`, etc.).
- Remove `filters`; use computed or utilities instead.
- Eliminate usage of the global event bus – use composables or Pinia store.
- Confirm no legacy Vue 2 specific APIs (e.g. `Vue.set`) remain; use native reactivity.
- Add unit test adjustments if the public interface changed.

## 5. Pinia Adoption

If a component still relies on Vuex-like patterns:

- Create (or update) a store in `app/stores/` using `defineStore`.
- Replace map helpers with direct store usage: `const store = useXStore()`.
- Ensure state is typed; derive readonly views with `computed` inside components or getters.
- Remove mutations; use actions for any synchronous or async changes.

## 6. Composables

New shared logic extracted from migrated components should live under `app/composables/`:

- Name files by domain not technology (e.g. `useIssueGeneration.ts` not `useApi.ts`).
- Keep composable functions under ~100 LOC; split if larger.
- Return a minimal, explicit surface (avoid returning everything by default).
- Document non-obvious side effects with a brief JSDoc comment.

## 7. Types

- Shared types go in `/types` (do not redefine large interfaces inside components).
- Local helper types can live adjacent to the component (inside the `<script setup>` block).
- Prefer literal unions and `as const` where appropriate to narrow types.

## 8. Markdown Rendering Example

Legacy pattern:

```vue
<!-- BEFORE -->
<script>
export default { props: ['rawMarkdown'] }
</script>

<template>
  <div v-html="rawMarkdown" />
</template>
```

Migrated pattern (current `MarkdownContentPreview.vue`):

```vue
<script setup lang="ts">
const props = defineProps<{ markdown: string }>()
</script>

<template>
  <div class="relative">
    <ButtonCopy :value="props.markdown" class="absolute top-4 right-4 z-10" />
    <MDC :value="props.markdown" tag="article" class="relative z-0 rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-neutral-800" />
  </div>
</template>
```

Key improvements: explicit prop typing, no direct `v-html` (safer), utility component usage.

## 9. Testing Strategy (Migration-specific)

- Snapshot tests: update only after verifying visual parity.
- Unit tests: prefer testing exported logic from composables directly (pure functions easier to assert).
- Component tests: use Vue Test Utils + a11y checks for any interactive changes introduced during migration.
- Add tests for newly extracted composables (happy path + 1 edge case).

## 10. Lint & Build Adjustments

- Ensure ESLint ignores large one-off docs (`eslint.config.js` already excludes `MIGRATION.md`).
- Confirm TypeScript config (`tsconfig.json`) includes `app/**/*` and shared types.
- Remove any leftover Vue 2 type shim declarations.

## 11. Performance Considerations (Only When Triggered by Migration)

Only address performance if the migration introduces regressions:

- Large reactive objects -> split into smaller refs/computed.
- Expensive computed -> memoize or convert to cached server data.
- Over-render lists -> extract child components.
  (Do NOT add generic infra performance commentary here.)

## 12. Rollback Approach (Code-Level)

If a migrated component causes issues:

- Revert the specific commit (no infra rollback needed).
- If store logic changed, restore previous store file from Git history.
- Avoid mixing unrelated refactors in the same PR to simplify rollback.

Infra / Terraform rollbacks, database migrations, DR, generic monitoring – intentionally excluded.

## 13. Communication & Tracking

- Use Jira ticket labels: `vue3-migration` for visibility.
- Link PRs to their tickets; include a short checklist in the PR description referencing section 4.
- Maintain a `PROGRESS.md` (root) summarizing converted components & remaining blockers.

## 14. Common Pitfalls

| Pitfall                                  | Resolution                                |
| ---------------------------------------- | ----------------------------------------- |
| Forgetting to remove `this.`             | Search & replace; convert to direct refs. |
| Returning giant objects from composables | Return only what callers need.            |
| Mixing styling refactors with migration  | Separate PRs.                             |
| Leaving implicit any types               | Add explicit interfaces or generics.      |
| Using `v-html` for markdown              | Use sanitized renderer component.         |

## 15. Quick Reference (TL;DR)

1. Convert component to `<script setup lang="ts">`.
2. Extract reusable logic into composable.
3. Adopt/adjust Pinia store usage.
4. Type everything shared; keep local types local.
5. Replace deprecated APIs & unsafe patterns.
6. Keep PRs small; update tests.
7. Track progress in `PROGRESS.md`.

---

Questions specifically about infrastructure, monitoring, Terraform, or alerts are outside the scope of this migration guide.
