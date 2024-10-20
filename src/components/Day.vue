<script setup lang="ts">

  const props = defineProps({
    dayIndex: Number,
    day: String,
  })
  
</script>

<template>
  <div>
    <div class="font-bold text-center text-gray-700 dark:text-gray-300">
      {{ day }}
    </div>
    <div class="text-lg font-bold">
      {{ dayIndex+1 }}
    </div>
    <div class="grid gap-2 h-full">
      <div class="w-full border-b border-t border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-300 shadow-xl bg-gradient-to-r from-gray-700 to-gray-900">
      </div>
    </div>
  </div>
</template>