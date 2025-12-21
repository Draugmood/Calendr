<script setup lang="ts">
// Define component props
interface Props {
  weekIndex: number;
}
defineProps<Props>();
</script>

<template>
  <div class="flex justify-center items-center w-full my-4">

    <div class="text-4xl font-bold text-gray-800 dark:text-white">
      Uke {{ weekIndex }}
    </div>

  </div>
</template>