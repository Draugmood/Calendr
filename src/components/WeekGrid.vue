<script setup lang="ts">
import { computed, defineProps, ref, watchEffect } from 'vue';
import Day from './Day.vue';

const props = defineProps({
  events: Array,
})

// Timeline / vertical alignment
const hourHeight = 60;
const gridStartHour = 6;
const gridEndHour = 24;

const daysOfWeek = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const datesInWeek = ref([]);

const updateWeekData = () => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
  datesInWeek.value = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    return day;
  });
};

watchEffect(() => {
  updateWeekData();
});

// Group events by day
const eventsByDay = computed(() => {
  const grouped = {};
  datesInWeek.value.forEach((date) => {
    const dateKey = date.toISOString().split('T')[0]; // Get YYYY-MM-DD
    grouped[dateKey] = []; // Initialize the day group
  });

  props.events.forEach((event) => {
    const startDate = new Date(event.start.dateTime || event.start.date);
    const dateKey = startDate.toISOString().split('T')[0];
    if (grouped[dateKey]) {
      grouped[dateKey].push(event);
    }
  });

  return grouped;
});
</script>

<template>
  <div class="relative flex flex-row w-full mx-auto">
    <!-- Timeline / margin -->
    <div class="w-12 flex flex-col items-end pr-2">
      <div class="h-16"></div>
      <div
        class="flex flex-col"
        :style="{ height: `${(gridEndHour - gridStartHour) * hourHeight}px`}"
      >
        <div
          v-for="hour in gridEndHour - gridStartHour"
          :key="hour"
          :style="{ height: `${hourHeight}px` }"
          class="content-center pt-2"
        >
          {{ gridStartHour + hour + ":00" }}
        </div>
      </div>
    </div>
    <!-- Days / rest of calendar -->
    <div class="grid grid-cols-7 w-full gap-2">
      <Day
      v-for="(date, index) in datesInWeek"
      :key="index"
      :date="date"
      :dayIndex="index"
      :day="daysOfWeek[index]"
      :events="eventsByDay[date.toISOString().split('T')[0]]"
      :hourHeight="hourHeight"
      :gridStartHour="gridStartHour"
      />
    </div>
    <!-- Horizontal Hour Lines -->
    <div
      class="absolute -top-3 -left-0.5 w-full h-full pointer-events-none"
      :style="{ height: `${(gridEndHour - gridStartHour) * hourHeight}px` }">
      <div
        v-for="hour in gridEndHour - gridStartHour"
        :key="hour"
        :style="{ top: `${((hour + 1) * hourHeight)}px` }"
        class="absolute border-t border-gray-300 dark:border-gray-900 w-full">
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
