
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HelloWorld from './components/HelloWorld.vue'
import MonthGrid from './components/MonthGrid.vue'
import MonthHeader from './components/MonthHeader.vue'
import WeekGrid from './components/WeekGrid.vue'
import WeekHeader from './components/WeekHeader.vue'

// Define constants for Google API
const CLIENT_ID = '456117121094-onppg75n7s8pj6dnifkueee0v0m3lqts.apps.googleusercontent.com';
const isAuthenticated = ref(false);
const events = ref([]);


async function fetchAccessToken(idToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: 'YOUR_CLIENT_SECRET', // Add your client secret here
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: idToken,
    }),
  });

  const data = await response.json();
  console.log('Access Token Response:', data);

  const accessToken = data.access_token;
  if (accessToken) {
    isAuthenticated.value = true;
    fetchEvents(accessToken);
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


async function fetchEvents(accessToken: string) {
  const now = new Date().toISOString(); // Get the current date and time in ISO format
  const allEvents = [];

  // Fetch all calendars
  const calendars = await fetchCalendars(accessToken);

  const params = new URLSearchParams({
    timeMin: now,
    orderBy: 'startTime',
    singleEvents: 'true',
    maxResults: '10', // doesnt seem to work?
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
      allEvents.push(...data.items);
    }
  }

  allEvents.sort((a, b) => {
    const dateA = new Date(a.start?.dateTime || a.start?.date);
    const dateB = new Date(b.start?.dateTime || b.start?.date);
    return dateA - dateB;
  });

  events.value = allEvents;
}


function handleCredentialResponse(response: { credential: string }) {
  console.log('Encoded JWT ID token:', response.credential);
  
  // Use the ID token to fetch the access token
  fetchAccessToken(response.credential);
}

function redirectToGoogleAuth() {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=http://localhost:4000` +
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
      <WeekHeader />
      
      <!-- Sign in button -->
      <button v-if="!isAuthenticated" @click="redirectToGoogleAuth">
        Sign in with Google
      </button>

      <!-- Display events after authentication -->
      <div v-if="isAuthenticated">
        <WeekGrid :events="events" />
      </div>

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
