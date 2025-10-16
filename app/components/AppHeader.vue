<script setup lang="ts">
import { appName } from '~/constants'

interface HeaderItem {
  label: string
  to?: string
  href?: string
  external?: boolean
}

const navigationItems: HeaderItem[] = [
  {
    label: 'Docs',
    href: 'https://github.com/dipodidae/jira-issue-writer#readme',
    external: true,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/dipodidae/jira-issue-writer',
    external: true,
  },
]
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        {{ appName }}
      </NuxtLink>
    </template>

    <template #right>
      <div class="flex items-center gap-3">
        <nav class="hidden items-center gap-3 md:flex" aria-label="Primary">
          <ULink
            v-for="item in navigationItems"
            :key="item.label"
            :href="item.href"
            :to="item.to"
            :external="item.external"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener noreferrer' : undefined"
            class="text-muted hover:text-primary text-sm font-medium transition-colors"
          >
            {{ item.label }}
          </ULink>
        </nav>

        <UColorModeButton />
      </div>
    </template>
  </UHeader>
</template>
