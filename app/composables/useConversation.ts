export function useConversation() {
  const store = useConversationStore()
  const prefs = usePreferencesStore()

  const {
    draftInput,
    errorMessage,
    isPending,
    pendingImage,
    hasMessages,
    canReset,
    canSubmit,
    composerPlaceholder,
    composerHint,
    statusLabel,
    setInput,
    clearInput,
  } = useDraftInput()

  const { submitCurrentMessage } = usePromptSubmission()

  function resetConversation() {
    clearInput()
    errorMessage.value = null
    store.resetActiveSession()
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
    pendingImage,
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
      clearInput()
      errorMessage.value = null
    },
    switchSession: (id: string) => {
      store.switchSession(id)
      clearInput()
    },
    deleteSession: store.deleteSession,

    // Actions
    resetConversation,
    setInput,
    submitCurrentMessage,
  }
}
