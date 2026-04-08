import type {
  ConversationMessage,
  PromptDraftData,
  PromptStage,
} from '#shared/types/api'

export interface ConversationSession {
  id: string
  title: string
  messages: ConversationMessage[]
  latestDraft: PromptDraftData | null
  originalPrompt: string
  previousClarifications: string[]
  currentStage: PromptStage
  pinnedContext: string
  createdAt: number
  updatedAt: number
}

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEmptySession(): ConversationSession {
  return {
    id: createSessionId(),
    title: 'New draft',
    messages: [],
    latestDraft: null,
    originalPrompt: '',
    previousClarifications: [],
    currentStage: 'initial',
    pinnedContext: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export const useConversationStore = defineStore('conversations', () => {
  const sessions = ref<ConversationSession[]>([createEmptySession()])
  const activeSessionId = ref<string>(sessions.value[0].id)

  const activeSession = computed(() => {
    return sessions.value.find(s => s.id === activeSessionId.value) || sessions.value[0]
  })

  const messages = computed(() => activeSession.value.messages)
  const latestDraft = computed(() => activeSession.value.latestDraft)
  const pinnedContext = computed({
    get: () => activeSession.value.pinnedContext,
    set: (val: string) => { activeSession.value.pinnedContext = val },
  })
  const currentStage = computed(() => activeSession.value.currentStage)
  const hasMessages = computed(() => activeSession.value.messages.length > 0)

  const draftHistory = computed(() => {
    return activeSession.value.messages
      .filter(m => m.kind === 'draft' && m.draft)
      .map(m => m.draft!)
  })

  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
  })

  function updateSession(patch: Partial<ConversationSession>) {
    const session = sessions.value.find(s => s.id === activeSessionId.value)
    if (session)
      Object.assign(session, { ...patch, updatedAt: Date.now() })
  }

  function createSession() {
    const session = createEmptySession()
    sessions.value.push(session)
    activeSessionId.value = session.id
  }

  function switchSession(id: string) {
    if (sessions.value.some(s => s.id === id)) {
      activeSessionId.value = id
    }
  }

  function deleteSession(id: string) {
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx === -1)
      return

    sessions.value.splice(idx, 1)

    if (sessions.value.length === 0) {
      const fresh = createEmptySession()
      sessions.value.push(fresh)
      activeSessionId.value = fresh.id
    }
    else if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value[0].id
    }
  }

  function resetActiveSession() {
    const session = sessions.value.find(s => s.id === activeSessionId.value)
    if (session) {
      Object.assign(session, {
        messages: [],
        latestDraft: null,
        originalPrompt: '',
        previousClarifications: [],
        currentStage: 'initial' as PromptStage,
        pinnedContext: '',
        title: 'New draft',
        updatedAt: Date.now(),
      })
    }
  }

  function pushMessage(message: ConversationMessage) {
    const session = sessions.value.find(s => s.id === activeSessionId.value)
    if (!session)
      return
    session.messages = [...session.messages, message]
    session.updatedAt = Date.now()

    // Auto-title from first user message
    if (session.title === 'New draft' && message.role === 'user') {
      session.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
    }
  }

  function markPreviousDraftsAsHistory() {
    const session = sessions.value.find(s => s.id === activeSessionId.value)
    if (!session)
      return
    session.messages = session.messages.map((msg) => {
      if (msg.kind !== 'draft')
        return msg
      return { ...msg, isCurrentDraft: false }
    })
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    sortedSessions,
    messages,
    latestDraft,
    pinnedContext,
    currentStage,
    hasMessages,
    draftHistory,
    updateSession,
    createSession,
    switchSession,
    deleteSession,
    resetActiveSession,
    pushMessage,
    markPreviousDraftsAsHistory,
  }
}, {
  persist: {
    pick: ['sessions', 'activeSessionId'],
  },
})
