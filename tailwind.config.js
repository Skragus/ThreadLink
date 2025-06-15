/** @type {import('tailwindcss').Config} */
export default {  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./ThreadLink.tsx",
  ],
  theme: {
    extend: {      colors: {
        'bg-primary': '#0D0D12',
        'box-violet': '#393A6B',
        'card-bg': '#1C1E2B',
        'highlight-blue': '#4B5CC4',
        'text-primary': '#C7D0FF',
        'text-secondary': '#7D87AD',
        'glow-accent': '#6E7FFF',
        'divider': '#181920',
        'link-text': '#A3B3F3',
      },
      fontFamily: {
        'outfit': ['Outfit', 'sans-serif'],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}