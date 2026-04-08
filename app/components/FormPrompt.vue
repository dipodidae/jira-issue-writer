<script setup lang="ts">
import type { IssueType, PromptResponse, PromptStage } from '#shared/types/api'
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
  agent: 'gpt-4o-mini',
  scope: ['ui'],
})

const toast = useToast()
const loadingIndicator = useLoadingIndicator()
const taskModalOpen = ref(false)
const clarificationModalOpen = ref(false)

interface TaskResultData {
  title: string
  description: string
  issueType: IssueType
  scope?: string
  priority?: string | null
  severity?: string | null
  labels?: string[]
  components?: string[]
  epicLink?: string | null
  parent?: string | null
  dependencies?: string[]
  estimate?: string | null
  riskAreas?: string[]
  dataSensitivity?: string
  acceptanceCriteria?: string[]
  multiItem?: boolean
}

const taskResult = ref<TaskResultData | null>(null)
const clarificationPrompt = ref('')
const previousClarifications = ref<string[]>([])
const currentStage = ref<PromptStage>('initial')

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
    scope: response.scope,
    priority: response.priority,
    severity: response.severity,
    labels: response.labels,
    components: response.components,
    epicLink: response.epicLink,
    parent: response.parent,
    dependencies: response.dependencies,
    estimate: response.estimate,
    riskAreas: response.riskAreas,
    dataSensitivity: response.dataSensitivity,
    acceptanceCriteria: response.acceptanceCriteria,
    multiItem: response.multiItem,
  }
  taskModalOpen.value = true
  clarificationModalOpen.value = false

  toast.add({
    title: 'Ticket generated',
    description: 'Your Jira ticket is ready to review.',
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
  loadingIndicator.start()
  try {
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
  finally {
    loadingIndicator.finish()
  }
}

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  taskResult.value = null
  resetForInitialRequest()

  await runPrompt()
}

const isPending = computed(() => status.value === 'pending')

const formRef = ref<{ $el: HTMLFormElement } | null>(null)
const handlePromptKeydown = useSubmitOnEnter(() => {
  if (isPending.value)
    return
  formRef.value?.$el?.requestSubmit()
})

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
    <UForm ref="formRef" :schema="schema" :state="state" @submit="onSubmit">
      <fieldset :disabled="isPending" class="space-y-4">
        <!-- Main textarea -->
        <UFormField name="prompt">
          <UTextarea
            v-model="state.prompt"
            placeholder="Describe the issue, bug, or feature request..."
            class="w-full"
            :rows="5"
            autoresize
            :ui="{
              base: 'rounded-xl border-[--border-default] bg-(--surface-panel) text-(--text-primary) placeholder:text-(--text-muted) focus:ring-2 focus:ring-primary-500/30',
            }"
            @keydown="handlePromptKeydown"
          />
          <template #hint>
            <span class="text-xs text-(--text-muted)">Enter to submit, Shift+Enter for newline</span>
          </template>
        </UFormField>

        <!-- Controls bar -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UFormField name="scope">
              <SelectScope v-model="state.scope" />
            </UFormField>
            <UFormField name="agent">
              <DropdownAgents v-model="state.agent" />
            </UFormField>
          </div>
          <UButton
            type="submit"
            :loading="isPending"
            :disabled="isPending"
            size="md"
            class="px-5"
          >
            <UIcon name="i-lucide-sparkles" class="size-4" />
            Generate
          </UButton>
        </div>
      </fieldset>
    </UForm>

    <!-- Loading indicator -->
    <div v-if="isPending" class="mt-6 flex items-center gap-2 text-sm text-(--text-secondary)">
      <UIcon name="i-lucide-loader-circle" class="text-primary-500 size-4 animate-spin" />
      Generating your ticket&hellip;
    </div>

    <!-- Error state -->
    <div v-if="errorMessage && !isPending" class="mt-6">
      <UAlert color="error" variant="subtle" :title="errorMessage" icon="i-lucide-alert-circle" />
    </div>

    <ModalJiraTask v-if="taskResult" v-model:open="taskModalOpen" :data="taskResult" />
    <ModalClarificationPrompt
      v-model:open="clarificationModalOpen"
      :prompt="clarificationPrompt"
      :loading="isPending"
      @submit="submitClarification"
    />
  </div>
</template>
