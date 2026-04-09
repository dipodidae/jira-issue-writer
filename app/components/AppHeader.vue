<script setup lang="ts">
import { appName } from '~/constants'

const showAbout = shallowRef(false)
const { toggle: toggleSidebar } = useMobileSidebar()
</script>

<template>
  <header class="z-50 border-b border-(--border-subtle) bg-(--surface-panel)">
    <div class="flex h-11 items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-menu"
          variant="ghost"
          color="neutral"
          size="xs"
          class="md:hidden"
          @click="toggleSidebar"
        />
        <div class="bg-primary-500/10 relative flex size-6 items-center justify-center rounded-md">
          <div class="bg-primary-500/20 absolute inset-0 animate-pulse rounded-md blur-sm" />
          <UIcon name="i-lucide-sparkles" class="text-primary-500 relative size-3.5" />
        </div>
        <span class="text-sm font-semibold tracking-[-0.03em] text-(--text-primary)">{{ appName }}</span>
      </div>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-info"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="showAbout = true"
        />
        <UButton
          to="https://github.com/dipodidae/jira-issue-writer"
          target="_blank"
          icon="i-carbon-logo-github"
          variant="ghost"
          color="neutral"
          size="xs"
        />
        <UColorModeButton variant="ghost" size="xs" />
      </div>
    </div>

    <UModal v-model:open="showAbout" :ui="{ content: 'sm:max-w-lg' }">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-sparkles" class="text-primary-500 size-5" />
          <span class="text-sm font-medium">{{ appName }}</span>
        </div>
      </template>

      <template #body>
        <div class="space-y-4 text-sm text-(--text-secondary)">
          <p>
            AI-powered tool that turns messy problem descriptions into structured, ready-to-file Jira issues through a conversational interface.
          </p>

          <div>
            <h4 class="mb-1.5 text-xs font-medium tracking-wider text-(--text-muted) uppercase">
              How to use
            </h4>
            <ol class="list-inside list-decimal space-y-1">
              <li>Describe a bug, feature, or task in plain language</li>
              <li>Answer any follow-up questions the AI asks</li>
              <li>Review the generated ticket with full Jira fields</li>
              <li>Refine the draft or copy it to your clipboard</li>
            </ol>
          </div>

          <div>
            <h4 class="mb-1.5 text-xs font-medium tracking-wider text-(--text-muted) uppercase">
              Tips
            </h4>
            <ul class="list-inside list-disc space-y-1">
              <li>Paste screenshots directly into the input for visual context</li>
              <li>Pin error logs or specs in the sidebar as background context</li>
              <li>Use quick-start templates for common ticket types</li>
              <li>Set the scope to focus generation on frontend, backend, or infra</li>
              <li>Work on multiple drafts in parallel via sessions</li>
            </ul>
          </div>

          <div>
            <h4 class="mb-1.5 text-xs font-medium tracking-wider text-(--text-muted) uppercase">
              Keyboard shortcuts
            </h4>
            <div class="flex gap-6">
              <div class="flex items-center gap-2">
                <kbd class="rounded border border-(--border-default) bg-(--surface-elevated) px-1.5 py-0.5 font-mono text-[10px] text-(--text-muted)">Enter</kbd>
                <span>Send message</span>
              </div>
              <div class="flex items-center gap-2">
                <kbd class="rounded border border-(--border-default) bg-(--surface-elevated) px-1.5 py-0.5 font-mono text-[10px] text-(--text-muted)">Shift+Enter</kbd>
                <span>New line</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton label="Got it" color="primary" class="ml-auto" @click="close" />
      </template>
    </UModal>
  </header>
</template>
