<script setup lang="ts">
const {
  progress,
  isLoading,
  error,
  clear,
  start,
  finish,
} = useLoadingIndicator({
  duration: 2_000,
  throttle: 200,
  hideDelay: 500,
  resetDelay: 400,
})

defineExpose({
  progress,
  isLoading,
  error,
  start,
  finish,
  clear,
})
</script>

<template>
  <div
    class="nuxt-loading-indicator pointer-events-none fixed top-0 right-0 left-0 z-[999999] h-2 w-auto bg-neutral-50 opacity-0" :class="{
      'bg-error': error,
      'bg-primary-400 dark:bg-primary-200 opacity-100': isLoading,
    }"
    :style="{
      backgroundSize: `${progress > 0 ? (100 / progress) * 100 : 0}% auto`,
      transform: `scaleX(${progress}%)`,
      transformOrigin: 'left',
      transition: 'transform 0.1s, height 0.4s, opacity 0.4s',
    }"
  />
</template>
