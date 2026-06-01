/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        body: ["Newsreader", "serif"],
        mono: ["Spline Sans Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
