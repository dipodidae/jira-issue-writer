<script setup lang="ts">
import type { IssueType } from '#shared/types/api'
import { ISSUE_TYPES } from '~/constants/issue-types'

const props = defineProps<{
  issueType: IssueType
}>()

const meta = computed(() => ISSUE_TYPES[props.issueType] || ISSUE_TYPES.task)
</script>

<template>
  <UBadge :color="meta.color" variant="solid" class="uppercase">
    {{ meta.label }}
  </UBadge>
</template>
