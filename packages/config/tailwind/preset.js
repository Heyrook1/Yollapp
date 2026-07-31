/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f4",
          100: "#dceee6",
          200: "#b9ddcd",
          300: "#8cc5ad",
          400: "#5aa688",
          500: "#3d8a6d",
          600: "#2e6e57",
          700: "#275847",
          800: "#22473a",
          900: "#1d3b31",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
