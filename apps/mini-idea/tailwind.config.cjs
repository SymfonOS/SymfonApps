// Colours, spacing, type and radius come only from the replica design tokens.
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../../replica/design/tailwind.preset.js')],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
};
