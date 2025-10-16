<script setup lang="ts">
interface GeneratedTask {
  title: string
  description: string
}

defineProps<{
  data: GeneratedTask
}>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Jira Task Generated"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <div>
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Title
          </h3>
          <UInput
            :model-value="data.title"
            readonly
            :ui="{ trailing: 'pr-0.5' }"
            class="w-full"
          >
            <template #trailing>
              <ButtonCopy :value="data.title" />
            </template>
          </UInput>
        </div>

        <div>
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Description
          </h3>
          <UTextarea
            :model-value="data.description"
            readonly
            :rows="8"
            :ui="{ trailing: 'pr-0.5' }"
            class="w-full"
          >
            <template #trailing>
              <ButtonCopy :value="data.description" />
            </template>
          </UTextarea>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton label="Close" color="neutral" variant="outline" @click="close" />
    </template>
  </UModal>
</template>
