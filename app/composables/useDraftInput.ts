import { MESSAGE_KIND, STAGE } from '~/constants'

const draftInput = shallowRef('')
const errorMessage = shallowRef<string | null>(null)
const isPending = shallowRef(false)
const pendingImage = shallowRef<string | null>(null)

export function useDraftInput() {
  const store = useConversationStore()

  const hasMessages = computed(() => store.hasMessages)
  const canReset = computed(() => hasMessages.value || !!store.latestDraft || draftInput.value.trim().length > 0)
  const canSubmit = computed(() => draftInput.value.trim().length > 0 && !isPending.value)

  const composerPlaceholder = computed(() => {
    if (isPending.value)
      return 'Drafting...'
    if (store.currentStage === STAGE.CLARIFY)
      return 'Answer to continue...'
    if (store.currentStage === STAGE.REFINE && store.latestDraft)
      return 'Refine this draft...'
    return 'Describe the issue or feature...'
  })

  const composerHint = computed(() => {
    return 'Enter to send, Shift+Enter for newline'
  })

  const statusLabel = computed(() => {
    if (isPending.value)
      return 'Drafting'
    if (store.currentStage === STAGE.CLARIFY)
      return 'Needs info'
    if (store.currentStage === STAGE.REFINE && store.latestDraft)
      return 'Draft ready'
    return 'Ready'
  })

  function createMessageId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function setInput(text: string) {
    draftInput.value = text
  }

  function clearInput() {
    draftInput.value = ''
    pendingImage.value = null
  }

  function clearError() {
    errorMessage.value = null
  }

  function pushAssistantError(reason: string) {
    store.pushMessage({
      id: createMessageId(),
      role: 'assistant',
      kind: MESSAGE_KIND.ERROR,
      content: reason,
      createdAt: Date.now(),
    })
    errorMessage.value = reason
  }

  return {
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
    createMessageId,
    setInput,
    clearInput,
    clearError,
    pushAssistantError,
  }
}
