import type {
  ConversationMessage,
  PromptDraftData,
  PromptRequest,
  PromptResponse,
  PromptResponseDone,
  PromptStage,
} from '#shared/types/api'

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toDraftData(response: PromptResponseDone): PromptDraftData {
  return {
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
}

const draftInput = ref('')
const selectedAgent = ref('gpt-5-mini')
const selectedScope = ref<string[]>(['ui'])
const messages = ref<ConversationMessage[]>([])
const latestDraft = ref<PromptDraftData | null>(null)
const originalPrompt = ref('')
const previousClarifications = ref<string[]>([])
const currentStage = ref<PromptStage>('initial')
const errorMessage = ref<string | null>(null)
const isPending = ref(false)

export function useConversation() {
  const toast = useToast()
  const loadingIndicator = useLoadingIndicator()

  const hasMessages = computed(() => messages.value.length > 0)
  const canReset = computed(() => hasMessages.value || draftInput.value.trim().length > 0)
  const canSubmit = computed(() => draftInput.value.trim().length > 0 && !isPending.value)

  const composerPlaceholder = computed(() => {
    if (isPending.value)
      return 'Drafting...'
    if (currentStage.value === 'clarify')
      return 'Answer to continue...'
    if (currentStage.value === 'refine' && latestDraft.value)
      return 'Refine this draft...'
    return 'Describe the issue or feature...'
  })

  const composerHint = computed(() => {
    return 'Enter to send, Shift+Enter for newline'
  })

  const statusLabel = computed(() => {
    if (isPending.value)
      return 'Drafting'
    if (currentStage.value === 'clarify')
      return 'Needs info'
    if (currentStage.value === 'refine' && latestDraft.value)
      return 'Draft ready'
    return 'Ready'
  })

  function resetConversation() {
    draftInput.value = ''
    messages.value = []
    latestDraft.value = null
    originalPrompt.value = ''
    previousClarifications.value = []
    currentStage.value = 'initial'
    errorMessage.value = null
  }

  function pushMessage(message: ConversationMessage) {
    messages.value = [...messages.value, message]
  }

  function markPreviousDraftsAsHistory() {
    messages.value = messages.value.map((message) => {
      if (message.kind !== 'draft')
        return message

      return {
        ...message,
        isCurrentDraft: false,
      }
    })
  }

  function pushAssistantError(reason: string) {
    pushMessage({
      id: createMessageId(),
      role: 'assistant',
      kind: 'error',
      content: reason,
      createdAt: Date.now(),
    })
    errorMessage.value = reason
  }

  function handleResponse(response: PromptResponse) {
    if (response.status === 'done') {
      const draft = toDraftData(response)
      const hadDraft = !!latestDraft.value

      markPreviousDraftsAsHistory()
      latestDraft.value = draft
      currentStage.value = 'refine'
      errorMessage.value = null

      pushMessage({
        id: createMessageId(),
        role: 'assistant',
        kind: 'draft',
        content: 'Draft ready',
        createdAt: Date.now(),
        draft,
        isCurrentDraft: true,
      })

      toast.add({
        title: hadDraft ? 'Draft updated' : 'Draft created',
        color: 'success',
      })
      return
    }

    if (response.status === 'needs_info') {
      const clarificationPrompt = response.missingInfoPrompt || 'What additional details would clarify the issue?'
      currentStage.value = latestDraft.value ? 'refine' : 'clarify'
      errorMessage.value = null

      pushMessage({
        id: createMessageId(),
        role: 'assistant',
        kind: 'clarification',
        content: clarificationPrompt,
        reason: response.reason,
        createdAt: Date.now(),
      })

      if (response.reason) {
        toast.add({
          title: 'More detail needed',
          color: 'warning',
        })
      }
      return
    }

    const reason = response.reason || 'Something went wrong.'
    pushAssistantError(reason)
    toast.add({
      title: 'Error',
      description: reason,
      color: 'error',
    })
  }

  async function submitCurrentMessage() {
    const messageText = draftInput.value.trim()
    if (!messageText || isPending.value)
      return

    const stage = currentStage.value
    const isClarification = stage === 'clarify'
    const isRefinement = stage === 'refine' && !!latestDraft.value

    pushMessage({
      id: createMessageId(),
      role: 'user',
      kind: 'prompt',
      content: messageText,
      createdAt: Date.now(),
    })

    draftInput.value = ''
    errorMessage.value = null

    let requestBody: PromptRequest

    if (isClarification) {
      const clarifications = [...previousClarifications.value, messageText]
      previousClarifications.value = clarifications
      requestBody = {
        text: originalPrompt.value,
        agent: selectedAgent.value,
        scope: selectedScope.value,
        previousClarifications: clarifications,
        stage,
      }
    }
    else if (isRefinement && latestDraft.value) {
      requestBody = {
        text: messageText,
        agent: selectedAgent.value,
        scope: selectedScope.value,
        stage,
        currentDraft: latestDraft.value,
      }
    }
    else {
      originalPrompt.value = messageText
      previousClarifications.value = []
      latestDraft.value = null
      currentStage.value = 'initial'
      requestBody = {
        text: messageText,
        agent: selectedAgent.value,
        scope: selectedScope.value,
        stage: 'initial',
      }
    }

    isPending.value = true
    loadingIndicator.start()

    try {
      const response = await $fetch<PromptResponse>('/api/prompt', {
        method: 'POST',
        body: requestBody,
      })
      handleResponse(response)
    }
    catch (error: any) {
      const reason = error?.data?.message || error?.message || 'Request failed.'
      pushAssistantError(reason)
      toast.add({
        title: 'Request failed',
        description: reason,
        color: 'error',
      })
    }
    finally {
      isPending.value = false
      loadingIndicator.finish()
    }
  }

  return {
    canReset,
    canSubmit,
    composerHint,
    composerPlaceholder,
    draftInput,
    errorMessage,
    hasMessages,
    isPending,
    latestDraft,
    messages,
    resetConversation,
    selectedAgent,
    selectedScope,
    statusLabel,
    submitCurrentMessage,
  }
}
