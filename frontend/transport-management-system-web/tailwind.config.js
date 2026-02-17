/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  important: false,
  corePlugins: {
    preflight: false,
    borderColor: false, // Désactive les styles de bordure
    borderRadius: false, // Désactive les coins arrondis de Tailwind
  },
  theme: {
    extend: {},
  },
  plugins: [],
}