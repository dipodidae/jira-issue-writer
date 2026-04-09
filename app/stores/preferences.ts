export const usePreferencesStore = defineStore('preferences', () => {
  const selectedAgent = shallowRef('gpt-4o-mini')
  const selectedScope = ref<string[]>(['ui'])

  return {
    selectedAgent,
    selectedScope,
  }
}, {
  persist: {
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
