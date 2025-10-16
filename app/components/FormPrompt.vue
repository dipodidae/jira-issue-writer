<script setup lang="ts">
import type { IssueType, PromptResponse, PromptStage } from '#shared/types/api'
import type { FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

const issueContextDescription = 'Share the relevant context, observed behaviour, expected outcome, and any reproduction steps so the agent can draft a complete Jira ticket.'

const schema = z.object({
  prompt: z.string().min(1, 'Issue context cannot be empty'),
  agent: z.string(),
  scope: z.array(z.string()).min(1, 'At least one scope must be selected'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  prompt: '',
  agent: 'gpt-4o-mini',
  scope: ['ui'],
})

const toast = useToast()
const taskModalOpen = ref(false)
const clarificationModalOpen = ref(false)

const taskResult = ref<{ title: string, description: string, issueType: IssueType } | null>(null)
const clarificationPrompt = ref('')
const previousClarifications = ref<string[]>([])
const currentStage = ref<PromptStage>('initial')

// Use useFetch with immediate: false - extract refs directly
const { data, error, status, execute } = await useFetch<PromptResponse>('/api/prompt', {
  method: 'POST',
  body: computed(() => ({
    text: state.prompt,
    agent: state.agent,
    scope: state.scope,
    previousClarifications: previousClarifications.value,
    stage: currentStage.value,
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

function resetForInitialRequest() {
  currentStage.value = 'initial'
  previousClarifications.value = []
  clarificationModalOpen.value = false
  clarificationPrompt.value = ''
  taskModalOpen.value = false
}

function handleNeedsInfo(response: PromptResponse) {
  clarificationPrompt.value = response.missingInfoPrompt || 'What additional details would clarify the issue?'
  clarificationModalOpen.value = true
  taskModalOpen.value = false

  if (response.reason) {
    toast.add({
      title: 'More information needed',
      description: response.reason,
      color: 'warning',
    })
  }
}

function handleDone(response: PromptResponse) {
  if (!response.title || !response.description || !response.issueType) {
    toast.add({
      title: 'Incomplete response',
      description: 'The assistant response was missing required fields (title, description, or issueType).',
      color: 'error',
    })
    return
  }

  taskResult.value = {
    title: response.title,
    description: response.description,
    issueType: response.issueType,
  }
  taskModalOpen.value = true
  clarificationModalOpen.value = false

  toast.add({
    title: 'Success',
    description: 'Jira task generated successfully!',
    color: 'success',
  })
}

function handleResponse(response: PromptResponse) {
  if (response.status === 'done') {
    handleDone(response)
  }
  else if (response.status === 'needs_info') {
    handleNeedsInfo(response)
  }
  else if (response.status === 'error') {
    const reason = response.reason || 'The assistant cannot continue without more information.'
    toast.add({
      title: 'Assistant error',
      description: reason,
      color: 'error',
    })
  }
  else {
    toast.add({
      title: 'Unexpected response',
      description: 'Received an unknown status from the assistant.',
      color: 'error',
    })
  }
}

async function runPrompt() {
  await execute()

  if (error.value) {
    toast.add({
      title: 'Error',
      description: errorMessage.value || 'An error occurred',
      color: 'error',
    })
    return
  }

  if (data.value)
    handleResponse(data.value)
}

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  taskResult.value = null
  resetForInitialRequest()

  await runPrompt()
}

async function submitClarification(message: string) {
  previousClarifications.value = [...previousClarifications.value, message]
  currentStage.value = 'clarify'
  clarificationModalOpen.value = false
  taskResult.value = null

  await runPrompt()
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
      <UFormField
        label="Issue Context"
        name="prompt"
        :description="issueContextDescription"
      >
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
          <UButton icon="mdi:arrow-right" type="submit" :loading="status === 'pending'" :disabled="status === 'pending'">
            Generate
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

    <ModalJiraTask v-if="taskResult" v-model:open="taskModalOpen" :data="taskResult" />
    <ModalClarificationPrompt
      v-model:open="clarificationModalOpen"
      :prompt="clarificationPrompt"
      :loading="status === 'pending'"
      @submit="submitClarification"
    />
  </div>
</template>
