<template>
  <div class="grid h-dvh grid-cols-[1fr] grid-rows-[auto_1fr] overflow-hidden bg-(--surface-page) md:grid-cols-[280px_1fr]">
    <AppHeader class="md:col-span-2" />
    <slot />
  </div>
</template>
