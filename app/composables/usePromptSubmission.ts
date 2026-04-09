import type {
  PromptDraftData,
  PromptRequest,
  PromptResponse,
  PromptResponseDone,
} from '#shared/types/api'
import { MESSAGE_KIND, SCOPE_DESCRIPTIONS, STAGE } from '~/constants'

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

function buildContextPrefix(text: string, scopes: string[], pinnedContext: string): string {
  const parts: string[] = []

  if (scopes.length) {
    const scopeLines = scopes
      .map(s => SCOPE_DESCRIPTIONS.get(s))
      .filter(Boolean)
      .map((desc, i) => `- ${scopes[i]}: ${desc}`)
    if (scopeLines.length) {
      parts.push(`[Scope focus]:\n${scopeLines.join('\n')}`)
    }
  }

  const ctx = pinnedContext.trim()
  if (ctx) {
    parts.push(`[Reference context]:\n${ctx}`)
  }

  if (!parts.length)
    return text
  return `${parts.join('\n\n')}\n\n[Request]:\n${text}`
}

export function usePromptSubmission() {
  const toast = useToast()
  const loadingIndicator = useLoadingIndicator()
  const store = useConversationStore()
  const prefs = usePreferencesStore()
  const {
    draftInput,
    isPending,
    pendingImage,
    createMessageId,
    clearInput,
    clearError,
    pushAssistantError,
  } = useDraftInput()

  function handleDoneResponse(response: PromptResponseDone) {
    const draft = toDraftData(response)
    const hadDraft = !!store.latestDraft

    store.markPreviousDraftsAsHistory()
    store.updateSession({ latestDraft: draft, currentStage: STAGE.REFINE })
    clearError()

    store.pushMessage({
      id: createMessageId(),
      role: 'assistant',
      kind: MESSAGE_KIND.DRAFT,
      content: 'Draft ready',
      createdAt: Date.now(),
      draft,
      isCurrentDraft: true,
    })

    toast.add({
      title: hadDraft ? 'Draft updated' : 'Draft created',
      color: 'success',
    })
  }

  function handleSuggestSplitResponse(response: PromptResponse & { status: 'suggest_split' }) {
    clearError()
    store.pushMessage({
      id: createMessageId(),
      role: 'assistant',
      kind: MESSAGE_KIND.SUGGEST_SPLIT,
      content: response.reason,
      proposedTasks: response.proposedTasks,
      createdAt: Date.now(),
    })
    toast.add({
      title: 'Split suggested',
      color: 'info',
    })
  }

  function handleNeedsInfoResponse(response: PromptResponse & { status: 'needs_info' }) {
    const clarificationPrompt = response.missingInfoPrompt || 'What additional details would clarify the issue?'
    store.updateSession({
      currentStage: store.latestDraft ? STAGE.REFINE : STAGE.CLARIFY,
    })
    clearError()

    store.pushMessage({
      id: createMessageId(),
      role: 'assistant',
      kind: MESSAGE_KIND.CLARIFICATION,
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
  }

  function handleResponse(response: PromptResponse) {
    if (response.status === 'done')
      return handleDoneResponse(response)
    if (response.status === 'suggest_split')
      return handleSuggestSplitResponse(response)
    if (response.status === 'needs_info')
      return handleNeedsInfoResponse(response)

    const reason = response.reason || 'Something went wrong.'
    pushAssistantError(reason)
    toast.add({
      title: 'Error',
      description: reason,
      color: 'error',
    })
  }

  function buildRequestBody(messageText: string): PromptRequest {
    const session = store.activeSession!
    const stage = session.currentStage
    const pinnedCtx = store.pinnedContext

    if (stage === STAGE.CLARIFY) {
      const clarifications = [...session.previousClarifications, messageText]
      store.updateSession({ previousClarifications: clarifications })
      return {
        text: buildContextPrefix(session.originalPrompt, prefs.selectedScope, pinnedCtx),
        agent: prefs.selectedAgent,
        scope: prefs.selectedScope,
        previousClarifications: clarifications,
        stage,
      }
    }

    if (stage === STAGE.REFINE && session.latestDraft) {
      return {
        text: buildContextPrefix(messageText, prefs.selectedScope, pinnedCtx),
        agent: prefs.selectedAgent,
        scope: prefs.selectedScope,
        stage,
        currentDraft: session.latestDraft,
        originalPrompt: session.originalPrompt,
        previousClarifications: session.previousClarifications,
      }
    }

    store.updateSession({
      originalPrompt: messageText,
      previousClarifications: [],
      latestDraft: null,
      currentStage: STAGE.INITIAL,
    })
    return {
      text: buildContextPrefix(messageText, prefs.selectedScope, pinnedCtx),
      agent: prefs.selectedAgent,
      scope: prefs.selectedScope,
      stage: STAGE.INITIAL,
    }
  }

  async function submitCurrentMessage() {
    const messageText = draftInput.value.trim()
    const imageUrl = pendingImage.value
    if ((!messageText && !imageUrl) || isPending.value)
      return

    store.pushMessage({
      id: createMessageId(),
      role: 'user',
      kind: MESSAGE_KIND.PROMPT,
      content: messageText || '(image)',
      createdAt: Date.now(),
      imageUrl: imageUrl ?? undefined,
    })

    clearInput()
    clearError()
    const requestBody = buildRequestBody(messageText || '(see attached image)')
    if (imageUrl)
      requestBody.imageUrl = imageUrl

    isPending.value = true
    loadingIndicator.start()

    try {
      const response = await $fetch<PromptResponse>('/api/prompt', {
        method: 'POST',
        body: requestBody,
      })
      handleResponse(response)
    }
    catch (error: unknown) {
      const err = error as { data?: { message?: string }, message?: string }
      const reason = err.data?.message || err.message || 'Request failed.'
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
    submitCurrentMessage,
  }
}
