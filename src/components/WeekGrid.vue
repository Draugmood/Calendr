<script setup lang="ts">
import { defineProps, ref, watchEffect } from 'vue';
import Day from './Day.vue';

const daysOfWeek = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const datesInWeek = ref([]);

const updateWeekData = () => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
  datesInWeek.value = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    return day.getDate();
  });
};

watchEffect(() => {
  updateWeekData();
});
</script>

<template>
  <div class="flex flex-row w-full mx-auto">
    <div class="w-12 flex flex-col items-end pr-2">
      <div class="h-16"></div>
      <div class="flex flex-col justify-evenly h-full">
        <div v-for="i in 19" :key="i" class="content-center">
          {{ i+5+":00" }}
        </div>
      </div>
    </div>
    <div class="grid grid-cols-7 w-full gap-2">
      <Day v-for="(day, index) in daysOfWeek" :key="day" :day="day" :dayIndex="index" />
    </div>
  </div>
</template>

<style scoped>
</style>
