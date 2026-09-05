/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A56DB", 
        success: "#16A34A", 
        danger: "#DC2626",  
      },
    },
  },
  plugins: [],
}
