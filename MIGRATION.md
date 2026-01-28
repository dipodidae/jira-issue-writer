# Vue 3 Migration (Entry Point)

The detailed migration guide now lives at `vue3-migration/README.md`.

This root file exists to provide a stable reference (`MIGRATION.md`) while keeping the guide itself modular.

## Quick Start
1. Read `vue3-migration/README.md` sections 1–5 before starting a conversion.
2. Update `PROGRESS.md` with each merged PR.
3. Keep PRs small and behavioral changes isolated.

## Why a Rewrite?
Previous drafts mixed infrastructure, monitoring, security, and disaster recovery topics not specific to migrating code from Vue 2 to Vue 3. Those have been removed to keep focus and reduce cognitive load.

If you need infra/platform details (Terraform, Kubernetes, alerts, DR): consult Confluence or the infra repository, not this migration guide.

## Questions
Open a Jira ticket with the `vue3-migration` label if any ambiguity remains.
