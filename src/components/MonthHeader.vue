<script setup lang="ts">

const emits = defineEmits(['update:month'])

const props = defineProps({
  monthIndex: Number,
  months: Array,
})

function changeMonth(increment: number) {
  const newMonthIndex = (props.monthIndex + increment + 12) % 12
  emits('update:month', newMonthIndex)
}

</script>

<template>
  <div class="flex justify-between items-center w-full max-w-4xl my-4">
    <button 
      @click="changeMonth(-1)"
      class="p-2 rounded bg-blue-500 text-white shadow-md hover:bg-blue-600"
    >
      Forrige
    </button>
    <div class="text-4xl font-bold text-gray-800 dark:text-white">
      {{ months[monthIndex] }}
    </div>
    <button 
      @click="changeMonth(1)"
      class="p-2 rounded bg-blue-500 text-white shadow-md hover:bg-blue-600"
    >
      Neste
    </button>
  </div>
</template>