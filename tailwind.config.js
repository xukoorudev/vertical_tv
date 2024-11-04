/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.html', // All HTML files inside the views folder
    './public/**/*.js',   // All JavaScript files inside the public folder
  ],
  safelist: [
    'bg-red-500',
    'text-white',
    'bg-blue-500',
    // Add other classes as needed
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

