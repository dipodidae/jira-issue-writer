<script setup lang="ts">
import type { AgentsResponse } from '#shared/types/api'

const model = defineModel<string>({ default: 'gpt-5-mini' })

const { data, status } = await useFetch<AgentsResponse>('/api/agents')

const selectedIcon = computed(() => {
  return data.value?.agents.find(agent => agent.value === model.value)?.icon || 'i-lucide-cpu'
})

const isDisabled = computed<boolean>(() => {
  if (data.value)
    return data.value.agents.length < 2

  return ['pending', 'error'].includes(status.value)
})
</script>

<template>
  <USelect
    v-model="model"
    :items="data?.agents || []"
    :icon="selectedIcon"
    value-key="value"
    placeholder="Select AI model"
    size="md"
    class="w-48"
    :disabled="isDisabled"
  />
</template>
