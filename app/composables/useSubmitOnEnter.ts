export function useSubmitOnEnter(onSubmit: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }
}
