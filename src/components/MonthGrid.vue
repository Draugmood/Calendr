<script setup lang="ts">
import { computed, ref } from 'vue'

defineProps<{ month: string }>()
  const monthIndex = ref(new Date().getMonth()) // Starting with the current month

  const updateMonth = (newMonthIndex) => {
    monthIndex.value = newMonthIndex
    // You might want to also update the daysInMonth and other related data here
  }
</script>

<template>
  <!-- Outer 7-column grid -->
  <div class="grid grid-cols-7 w-full max-w-4xl gap-2">
    <!-- Days of the Week Header -->
    <div class="font-bold text-center text-gray-700 dark:text-gray-300" v-for="day in daysOfWeek" :key="day">
      {{ day }}
    </div>

    <!-- Inner grid for dates -->
    <div class="col-span-7 grid grid-cols-7 gap-2">
      <!-- Empty cells for days of previous month -->
      <div class="text-center px-4 py-2" v-for="empty in startingEmptyCells" :key="empty"></div>

      <!-- Day Cells -->
      <div class="border-b border-t border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-300 shadow-xl bg-gradient-to-r from-gray-700 to-gray-900" v-for="day in daysInMonth" :key="day">
        {{ day }}
      </div>

      <!-- Empty cells for days of next month -->
      <div class="text-center px-4 py-2" v-for="empty in endingEmptyCells" :key="empty"></div>

    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'CalendarGrid',
  data() {
    return {
      // Assuming October starts on Monday and has 31 days
      daysOfWeek: ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'],
      daysInMonth: Array.from({ length: 31 }, (_, i) => i + 1),
      startingEmptyCells: Array.from({ length: 0 }), // October starts on Monday, no empty cells needed
      endingEmptyCells: Array.from({ length: 4 }) // Filler for the last row to complete the grid
    };
  },
};
</script>
