<script setup lang="ts">

defineProps ({
  weekIndex: Number,
  weeks: Array,
})

</script>

<template>
  <div class="flex justify-center items-center w-full my-4">
    
    <div class="text-4xl font-bold text-gray-800 dark:text-white">
      Uke {{ weekIndex }}
    </div>
    
  </div>
</template>