<script setup lang="ts">
const { isOpen, close } = useMobileSidebar()
</script>

<template>
  <div class="contents">
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isOpen"
          class="fixed inset-0 z-40 bg-black/50 md:hidden"
          @click="close"
        />
      </Transition>
    </Teleport>

    <SidebarPanel
      class="fixed inset-y-0 left-0 z-50 w-[280px] -translate-x-full transition-transform duration-200 md:relative md:translate-x-0"
      :class="{ 'translate-x-0!': isOpen }"
      @click.self="close"
    />

    <FormPrompt class="min-h-0" />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
