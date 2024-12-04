<script setup lang="ts">

// Define props for day, dayIndex, and events
const props = defineProps({
  date: Date,
  dayIndex: Number, // Index of the day (0-6 for Monday-Sunday)
  day: String,      // Name of the day (e.g., 'Mandag')
  events: Array,    // List of events for this day
  hourHeight: Number,
  gridStartHour: Number,
});

// Function to calculate event position
function calculateEventStyle(event) {

  // Parse the start and end times of the event
  const startTime = new Date(event.start.dateTime || event.start.date);
  const endTime = new Date(event.end.dateTime || event.end.date);

  // Calculate the start offset in hours relative to the grid's starting hour
  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
  const topOffset = (startHour - props.gridStartHour) * props.hourHeight;

  // Calculate the duration in hours
  const endHour = endTime.getHours() + endTime.getMinutes() / 60;
  const duration = endHour - startHour;
  const height = duration * props.hourHeight;

  return {
    top: `${topOffset}px`,
    height: `${height}px`,
  };
}


</script>

<template>
  <div class="relative h-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg">
    <!-- Day Header -->
    <div class="font-bold text-center text-gray-700 dark:text-gray-300">
      {{ day }}
      <br />
      {{ date?.getDate() }}
    </div>

    <!-- Events for the day -->
    <div class="relative h-full">
      <div
        v-for="event in events"
        :key="event.id"
        class="absolute left-2 right-2 bg-blue-500 text-white text-xs rounded-lg shadow-lg px-2 py-1"
        :style="calculateEventStyle(event)"
      >
        {{ event.summary }}
        <br />
        {{ new Date(event.start.dateTime || event.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
        -
        {{ new Date(event.end.dateTime || event.end.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
      </div>
    </div>
  </div>
</template>
