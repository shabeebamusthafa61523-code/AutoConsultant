/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        benz: {
          red: "#D90429",
          darkred: "#EF233C",
          black: "#111827",
          dark: "#1F2937",
          light: "#F8FAFC",
          card: "#FFFFFF",
          accent: "#FFF1F2"
        }
      }
    },
  },
  plugins: [],
}
