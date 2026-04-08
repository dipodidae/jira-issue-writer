export const usePreferencesStore = defineStore('preferences', () => {
  const selectedAgent = ref('gpt-4o-mini')
  const selectedScope = ref<string[]>(['ui'])

  return {
    selectedAgent,
    selectedScope,
  }
}, {
  persist: true,
})
