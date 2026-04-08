import type {
  PromptDraftData,
  PromptRequest,
  PromptResponse,
  PromptResponseDone,
} from '#shared/types/api'
import { SCOPE_DESCRIPTIONS } from '~/constants'

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
const errorMessage = ref<string | null>(null)
const isPending = ref(false)

export function useConversation() {
  const toast = useToast()
  const loadingIndicator = useLoadingIndicator()
  const store = useConversationStore()
  const prefs = usePreferencesStore()

  const hasMessages = computed(() => store.hasMessages)
  const canReset = computed(() => hasMessages.value || draftInput.value.trim().length > 0)
  const canSubmit = computed(() => draftInput.value.trim().length > 0 && !isPending.value)

  const composerPlaceholder = computed(() => {
    if (isPending.value)
      return 'Drafting...'
    if (store.currentStage === 'clarify')
      return 'Answer to continue...'
    if (store.currentStage === 'refine' && store.latestDraft)
      return 'Refine this draft...'
    return 'Describe the issue or feature...'
  })

  const composerHint = computed(() => {
    return 'Enter to send, Shift+Enter for newline'
  })

  const statusLabel = computed(() => {
    if (isPending.value)
      return 'Drafting'
    if (store.currentStage === 'clarify')
      return 'Needs info'
    if (store.currentStage === 'refine' && store.latestDraft)
      return 'Draft ready'
    return 'Ready'
  })

  function buildContextPrefix(text: string): string {
    const parts: string[] = []

    // Scope descriptions — tells the AI what areas to focus on
    const scopes = prefs.selectedScope
    if (scopes.length) {
      const scopeLines = scopes
        .map(s => SCOPE_DESCRIPTIONS.get(s))
        .filter(Boolean)
        .map((desc, i) => `- ${scopes[i]}: ${desc}`)
      if (scopeLines.length) {
        parts.push(`[Scope focus]:\n${scopeLines.join('\n')}`)
      }
    }

    // Pinned context
    const ctx = store.pinnedContext.trim()
    if (ctx) {
      parts.push(`[Reference context]:\n${ctx}`)
    }

    if (!parts.length)
      return text
    return `${parts.join('\n\n')}\n\n[Request]:\n${text}`
  }

  function resetConversation() {
    draftInput.value = ''
    errorMessage.value = null
    store.resetActiveSession()
  }

  function pushAssistantError(reason: string) {
    store.pushMessage({
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
      const hadDraft = !!store.latestDraft

      store.markPreviousDraftsAsHistory()
      store.updateSession({ latestDraft: draft, currentStage: 'refine' })
      errorMessage.value = null

      store.pushMessage({
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
      store.updateSession({
        currentStage: store.latestDraft ? 'refine' : 'clarify',
      })
      errorMessage.value = null

      store.pushMessage({
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

    const session = store.activeSession
    const stage = session.currentStage
    const isClarification = stage === 'clarify'
    const isRefinement = stage === 'refine' && !!session.latestDraft

    store.pushMessage({
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
      const clarifications = [...session.previousClarifications, messageText]
      store.updateSession({ previousClarifications: clarifications })
      requestBody = {
        text: buildContextPrefix(session.originalPrompt),
        agent: prefs.selectedAgent,
        scope: prefs.selectedScope,
        previousClarifications: clarifications,
        stage,
      }
    }
    else if (isRefinement && session.latestDraft) {
      requestBody = {
        text: buildContextPrefix(messageText),
        agent: prefs.selectedAgent,
        scope: prefs.selectedScope,
        stage,
        currentDraft: session.latestDraft,
      }
    }
    else {
      store.updateSession({
        originalPrompt: messageText,
        previousClarifications: [],
        latestDraft: null,
        currentStage: 'initial',
      })
      requestBody = {
        text: buildContextPrefix(messageText),
        agent: prefs.selectedAgent,
        scope: prefs.selectedScope,
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
    // State
    canReset,
    canSubmit,
    composerHint,
    composerPlaceholder,
    draftHistory: computed(() => store.draftHistory),
    draftInput,
    errorMessage,
    hasMessages,
    isPending,
    latestDraft: computed(() => store.latestDraft),
    messages: computed(() => store.messages),
    pinnedContext: computed({
      get: () => store.pinnedContext,
      set: (val: string) => { store.pinnedContext = val },
    }),
    selectedAgent: computed({
      get: () => prefs.selectedAgent,
      set: (val: string) => { prefs.selectedAgent = val },
    }),
    selectedScope: computed({
      get: () => prefs.selectedScope,
      set: (val: string[]) => { prefs.selectedScope = val },
    }),
    statusLabel,

    // Session management
    sessions: computed(() => store.sortedSessions),
    activeSessionId: computed(() => store.activeSessionId),
    createSession: () => {
      store.createSession()
      draftInput.value = ''
    },
    switchSession: (id: string) => {
      store.switchSession(id)
      draftInput.value = ''
    },
    deleteSession: store.deleteSession,

    // Actions
    resetConversation,
    submitCurrentMessage,
  }
}
