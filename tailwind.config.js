/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      bgCol: {
        DEFAULT: '#242424',
        light: '#ffffff',
      },
      txtCol: {
        DEFAULT: 'rgba(255, 255, 255, 0.87)',
        light: '#213547',
      },
      btnCol: {
        DEFAULT: '#1a1a1a',
        light: '#f9f9f9',
      },
      linkHoverCol: {
        DEFAULT: '#ff5a5f',
        light: '#ff5a5f',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      lineHeight: {
        'normal': '1.5',
      },
      fontWeight: {
        'normal': '400',
        'medium': '500',
      },
    },
  },
  plugins: [],
  darkMode: 'media',
}

