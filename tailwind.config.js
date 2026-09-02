/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        teal:      { DEFAULT: '#2A9D8F', dark: '#1E7268', deep: '#134B45' },
        periwinkle:{ DEFAULT: '#7B9FD4', light: '#A8CEDE', pale: '#C9E6EE' },
        coral:     { DEFAULT: '#FF8F6B', deep: '#C75A3D', soft: '#FFF0EA' },
        ink:       { DEFAULT: '#1F3A3D', muted: '#5C7478', faint: '#94A8AB' },
        surface:   { DEFAULT: '#FFFFFF', subtle: '#F7FAFB', border: '#E7EEF0' },
      },
    },
  },
  plugins: [],
}
