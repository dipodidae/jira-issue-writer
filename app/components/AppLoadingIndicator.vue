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
    class="pointer-events-none fixed top-0 right-0 left-0 z-[999999] h-0.5 w-auto opacity-0"
    :class="{
      'bg-red-500': error,
      'bg-primary-500 opacity-100': isLoading,
    }"
    :style="{
      backgroundSize: `${progress > 0 ? (100 / progress) * 100 : 0}% auto`,
      transform: `scaleX(${progress}%)`,
      transformOrigin: 'left',
      transition: 'transform 0.1s, height 0.4s, opacity 0.4s',
    }"
  />
</template>
