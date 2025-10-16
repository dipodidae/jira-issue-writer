declare module 'nuxt/schema' {
  interface RuntimeConfig {
    openaiApiKey: string
  }
}

// It is always important to ensure you import/export something when augmenting a type
export {}

declare module '*.md?raw' {
  const content: string
  export default content
}
