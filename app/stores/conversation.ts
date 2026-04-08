import type {
  ConversationMessage,
  PromptDraftData,
  PromptStage,
} from '#shared/types/api'
import { SESSION_TITLE_MAX_LENGTH, STAGE } from '~/constants'

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
    currentStage: STAGE.INITIAL,
    pinnedContext: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// Replace a session immutably so the top-level ref triggers persistence
function replaceSession(
  list: ConversationSession[],
  id: string,
  updater: (s: ConversationSession) => ConversationSession,
): ConversationSession[] {
  return list.map(s => s.id === id ? updater(s) : s)
}

export const useConversationStore = defineStore('conversations', () => {
  const sessions = ref<ConversationSession[]>([createEmptySession()])
  const activeSessionId = ref<string>(sessions.value[0]!.id)

  const activeSession = computed((): ConversationSession => {
    return sessions.value.find(s => s.id === activeSessionId.value) ?? sessions.value[0]!
  })

  const messages = computed(() => activeSession.value.messages)
  const latestDraft = computed(() => activeSession.value.latestDraft)
  const pinnedContext = computed({
    get: () => activeSession.value.pinnedContext,
    set: (val: string) => {
      sessions.value = replaceSession(sessions.value, activeSessionId.value, s => ({
        ...s,
        pinnedContext: val,
        updatedAt: Date.now(),
      }))
    },
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
    sessions.value = replaceSession(sessions.value, activeSessionId.value, s => ({
      ...s,
      ...patch,
      updatedAt: Date.now(),
    }))
  }

  function createSession() {
    const session = createEmptySession()
    sessions.value = [...sessions.value, session]
    activeSessionId.value = session.id
  }

  function switchSession(id: string) {
    if (sessions.value.some(s => s.id === id)) {
      activeSessionId.value = id
    }
  }

  function deleteSession(id: string) {
    const filtered = sessions.value.filter(s => s.id !== id)
    if (filtered.length === 0) {
      const fresh = createEmptySession()
      sessions.value = [fresh]
      activeSessionId.value = fresh.id
    }
    else {
      sessions.value = filtered
      if (activeSessionId.value === id) {
        activeSessionId.value = filtered[0]!.id
      }
    }
  }

  function resetActiveSession() {
    sessions.value = replaceSession(sessions.value, activeSessionId.value, s => ({
      ...s,
      messages: [],
      latestDraft: null,
      originalPrompt: '',
      previousClarifications: [],
      currentStage: STAGE.INITIAL as PromptStage,
      pinnedContext: '',
      title: 'New draft',
      updatedAt: Date.now(),
    }))
  }

  function pushMessage(message: ConversationMessage) {
    sessions.value = replaceSession(sessions.value, activeSessionId.value, (s) => {
      const title = s.title === 'New draft' && message.role === 'user'
        ? message.content.slice(0, SESSION_TITLE_MAX_LENGTH) + (message.content.length > SESSION_TITLE_MAX_LENGTH ? '...' : '')
        : s.title
      return {
        ...s,
        messages: [...s.messages, message],
        title,
        updatedAt: Date.now(),
      }
    })
  }

  function markPreviousDraftsAsHistory() {
    sessions.value = replaceSession(sessions.value, activeSessionId.value, s => ({
      ...s,
      messages: s.messages.map(msg =>
        msg.kind === 'draft' ? { ...msg, isCurrentDraft: false } : msg,
      ),
      updatedAt: Date.now(),
    }))
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
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
