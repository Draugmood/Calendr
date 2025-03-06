
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MonthGrid from './components/MonthGrid.vue'
import MonthHeader from './components/MonthHeader.vue'
import WeekGrid from './components/WeekGrid.vue'
import WeekHeader from './components/WeekHeader.vue'

// Define constants for Google API
const CLIENT_ID = '456117121094-onppg75n7s8pj6dnifkueee0v0m3lqts.apps.googleusercontent.com';
const isAuthenticated = ref(false);
const events = ref<CalendarEvent[]>([]);
const trelloBaseUrl = 'https://api.trello.com/1';
const trelloToken = 'teams'
const trelloKey = 'teams'
const todoList = ref<Checklist | null>(null);


function toggleDarkMode(): void {
  document.documentElement.classList.toggle('dark');
}

async function fetchTrelloChecklist(): Promise<void> {
  const checklistId = '64ad489c7646ab7234ef0e21';
  const url = `${trelloBaseUrl}/checklists/${checklistId}?key=${trelloKey}&token=${trelloToken}`;

  try {
    const response = await fetch(url, {
        method: 'GET',
      });
  
    const data: Checklist = await response.json();
    todoList.value = data;

  } catch (error) {
    console.error('Error fetching todo list from Trello:', error);
  }
}

function toggleItemState(index: number) {
  // Toggle the state between 'complete' and 'incomplete'
  const item = todoList.value?.checkItems[index];
  if (item) {
    const newState = item.state === 'complete' ? 'incomplete' : 'complete';
    item.state = newState;

    updateTrelloChecklistItem(item.id, newState);
  }
}

async function updateTrelloChecklistItem(checkItemId: string, newState: 'complete' | 'incomplete'): Promise<void> {
  const url = `${trelloBaseUrl}/cards/${todoList.value?.idCard}/checkItem/${checkItemId}?key=${trelloKey}&token=${trelloToken}&state=${newState}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
    });

    if (!response.ok) {
      throw new Error(`Failed to update item state. Status: ${response.status}`);
    }

    console.log(`Successfully updated item ${checkItemId} to ${newState}`);
  } catch (error) {
    console.error('Error updating checklist item:', error);
  }
}


async function fetchCalendars(accessToken: string) {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  return data.items || [];
}


async function fetchEvents(accessToken: string, weekStartDate?: Date) {

  const startOfWeek = weekStartDate || new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const allEvents = [];
  const calendars = await fetchCalendars(accessToken);

  const params = new URLSearchParams({
    timeMin: startOfWeek.toISOString(),
    timeMax: endOfWeek.toISOString(),
    orderBy: 'startTime',
    singleEvents: 'true',
  });

  const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars';

  for (const calendar of calendars) {
    const url = `${baseUrl}/${encodeURIComponent(calendar.id)}/events?${params.toString()}`;
    const response = await fetch(url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    if (data.items) {
      data.items.forEach((event: CalendarEvent) => {
        event.source = calendar.summary;
      });
      allEvents.push(...data.items);
    }
  }

  allEvents.sort((a, b) => {
    const dateA = new Date(a.start?.dateTime || a.start?.date).getTime();
    const dateB = new Date(b.start?.dateTime || b.start?.date).getTime();
    return dateA - dateB;
  });

  console.log('Fetched events: ', allEvents);
  events.value = allEvents;
}


function redirectToGoogleAuth(): void {
  const redirectUri: string = window.location.origin;
  
  const authUrl: string = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=https://www.googleapis.com/auth/calendar.readonly`;

  window.location.href = authUrl;
}


const months = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
]

const viewMode = ref('weekly')
  
const currentMonthIndex = ref(new Date().getMonth())

const updateMonthIndex = (newIndex: number) => {
  currentMonthIndex.value = newIndex
}

const getCurrentWeekIndex = (d = new Date()) => {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1)).getTime();
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d.getTime() - yearStart) / 86400000) + 1)/7);
  // Return array of year and week number
  return weekNo;
}

const currentWeekIndex = ref(getCurrentWeekIndex())

function getAccessTokenFromUrl() {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  if (accessToken) {
    isAuthenticated.value = true;
    fetchEvents(accessToken);
  }
}

onMounted(() => {
  getAccessTokenFromUrl();
  fetchTrelloChecklist();
});

</script>

<template>
  <div class="flex flex-col items-center bg-white dark:bg-gray-800 p-4 mt-8 rounded-lg shadow-lg w-full">
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
      <div class="w-full relative">
        <WeekHeader :weekIndex="currentWeekIndex" />
        <button @click="toggleDarkMode" class="absolute top-0 right-4 p-2 rounded bg-blue-500 text-white shadow-md hover:bg-blue-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors">
          🌙
        </button>
      </div>
      
      <!-- Sign in button -->
      <button v-if="!isAuthenticated" @click="redirectToGoogleAuth">
        Sign in with Google
      </button>

      <!-- Display events after authentication -->
      <div v-if="isAuthenticated">
        <WeekGrid :events="events" :fetchEventsForWeek="fetchEvents" />
      </div>

      <!-- Todo-list -->
      <div v-if="todoList" class="flex flex-col mt-8 w-full items-center justify-center">
        <div class="border border-gray-600 rounded-lg p-4 max-h-80 w-full max-w-md overflow-y-auto">
          <h2 class="text-2xl font-bold mb-4">{{ todoList.name }}</h2>
          <ul class="w-full max-w-md">
            <li
              v-for="(item, index) in [...todoList.checkItems].reverse()"
              :key="item.id"
              class="flex items-center justify-between mb-2 gap-x-8"
            >
              <label
                :for="`item-${item.id}`"
                :class="{'text-gray-500 line-through': item.state === 'complete'}"
                class="text-lg cursor-pointer"
              >
                {{ item.name }}
              </label>
              <input
                type="checkbox"
                :id="`item-${item.id}`"
                :checked="item.state === 'complete'"
                @change="toggleItemState(index)"
                class="h-5 w-5 min-w-5"
              />
            </li>
          </ul>
        </div>
      </div>

    </div>
  </div>
</template>
