<script setup lang="ts">

const props = defineProps<{
  date: Date,
  dayIndex: number,
  day: string,
  events: CalendarEvent[],
  hourHeight: number,
  gridStartHour: number,
}>();

// Function to calculate event position
function calculateEventStyle(event: CalendarEvent) {

  // Parse the start and end times of the event
  const startTime = new Date(event.start.dateTime ?? event.start.date ?? '');
  const endTime = new Date(event.end.dateTime ?? event.end.date ?? '');

  // Calculate the start offset in hours relative to the grid's starting hour
  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
  const topOffset = (startHour - props.gridStartHour) * props.hourHeight;

  // Calculate the duration in hours
  const endHour = endTime.getHours() + endTime.getMinutes() / 60;
  const duration = endHour - startHour;
  const height = duration * props.hourHeight;

  return {
    top: `${topOffset}px`,
    height: `${height-1}px`,
  };
}

function getEventColorClass(event: CalendarEvent) {
  const colorMapping: Record<string, string> = {
    '1': 'bg-green-100',
    '2': 'bg-green-500',
    '3': 'bg-fuchsia-600',
    '4': 'bg-purple-500',
    '5': 'bg-amber-400',
    '6': 'bg-yellow-500',
    '7': 'bg-blue-400',
  };

  // If colorId is present and matches a key, return that class.
  // Otherwise, return a default color.
  let color = event.colorId && colorMapping[event.colorId] ? colorMapping[event.colorId] : 'bg-lavender';
  if (event.source === 'mortostr@gmail.com') {
    color = 'bg-blue-400';
  }
  return color
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
        class="z-10 absolute left-2 right-2 text-black text-xs rounded-lg shadow-lg px-2 py-1 max-w-full"
        :class="getEventColorClass(event)"
        :style="calculateEventStyle(event)"
      >
        <strong class="truncate block w-full whitespace-nowrap overflow-hidden text-ellipsis">{{ event.summary }}</strong>
        
        {{ new Date(event.start.dateTime || event.start.date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }}
        -
        {{ new Date(event.end.dateTime || event.end.date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }}
      </div>
    </div>
  </div>
</template>
