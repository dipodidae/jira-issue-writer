<script setup lang="ts">
import type { PromptResponse } from '#shared/types/api'
import type { FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

const schema = z.object({
  prompt: z.string().min(1, 'Issue context cannot be empty'),
  agent: z.string(),
  scope: z.array(z.string()).min(1, 'At least one scope must be selected'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  prompt: '',
  agent: 'gpt-5-mini',
  scope: ['ui'],
})

const toast = useToast()
const modalOpen = ref(false)

// Use useFetch with immediate: false - extract refs directly
const { data, error, status, execute } = await useFetch<PromptResponse>('/api/prompt', {
  method: 'POST',
  body: computed(() => ({
    text: state.prompt,
    agent: state.agent,
    scope: state.scope,
  })),
  immediate: false,
  watch: false,
})

// Computed for error message from extracted error ref
const errorMessage = computed(() => {
  if (!error.value)
    return null
  return error.value?.data?.message || error.value?.message || 'An unexpected error occurred'
})

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  // Execute the fetch
  await execute()

  // Handle response using extracted refs
  if (error.value) {
    toast.add({
      title: 'Error',
      description: errorMessage.value || 'An error occurred',
      color: 'error',
    })
  }
  else if (data.value) {
    toast.add({
      title: 'Success',
      description: 'Jira task generated successfully!',
      color: 'success',
    })
    modalOpen.value = true
  }
}
</script>

<template>
  <div>
    <UAlert
      color="primary"
      variant="soft"
      title="How it works"
      description="Simply paste any information you have—Slack messages, bug reports, feature requests, or rough notes. Select the relevant scope, choose an agent, and click generate to create a well-structured Jira task."
      class="mb-6"
    />

    <UForm :schema="schema" :state="state" @submit="onSubmit">
      <UFormField label="Issue Context" name="prompt">
        <UTextarea
          v-model="state.prompt"
          placeholder="Describe the issue, bug, or feature request..."
          class="w-full"
          :rows="8"
        />
      </UFormField>
      <div class="mt-8 flex">
        <div class="ml-auto flex items-end gap-2">
          <UFormField label="Scope" name="scope">
            <SelectScope v-model="state.scope" />
          </UFormField>
          <UFormField label="Agent" name="agent">
            <DropdownAgents v-model="state.agent" />
          </UFormField>
          <UButton type="submit" :loading="status === 'pending'" :disabled="status === 'pending'">
            Generate Jira Task
          </UButton>
        </div>
      </div>
    </UForm>

    <div v-if="status === 'pending'" class="mt-6">
      <UAlert title="Processing..." description="Generating Jira task from your input..." />
    </div>

    <div v-if="errorMessage" class="mt-6">
      <UAlert color="error" :title="errorMessage" />
    </div>

    <ModalJiraTask v-if="data" v-model:open="modalOpen" :data="data" />
  </div>
</template>
