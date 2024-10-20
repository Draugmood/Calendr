
<script setup lang="ts">
import { ref } from 'vue'
import HelloWorld from './components/HelloWorld.vue'
import MonthGrid from './components/MonthGrid.vue'
import MonthHeader from './components/MonthHeader.vue'
import WeekGrid from './components/WeekGrid.vue'
import WeekHeader from './components/WeekHeader.vue'

  
const months = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
]

const viewMode = ref('weekly')
  
const currentMonthIndex = ref(new Date().getMonth())

const updateMonthIndex = (newIndex) => {
  currentMonthIndex.value = newIndex
}

const getCurrentWeekIndex = (d = new Date()) => {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  // Return array of year and week number
  return weekNo;
}

const currentWeekIndex = ref(getCurrentWeekIndex())

</script>

<template>
  <div class="flex flex-col items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-screen">
    <!-- Monthly view -->
    <div class="" v-if="viewMode === 'monthly'">
      <MonthHeader 
        :monthIndex="currentMonthIndex"
        :months="months"
        @update:month="updateMonthIndex"
      />
      <MonthGrid :month="months[currentMonthIndex]" />
    </div>
    
    <!-- Weekly view -->
    <div class="w-full" v-if="viewMode === 'weekly'">
      <WeekHeader />
      <WeekGrid :weekIndex="currentWeekIndex" />
    </div>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
