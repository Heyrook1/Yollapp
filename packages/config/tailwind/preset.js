/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        yolla: {
          blue: "#2F6BFF",
          orange: "#FF6A00",
        },
        ink: {
          DEFAULT: "#0B1220",
          secondary: "#5B657A",
          inverse: "#FFFFFF",
        },
        surface: {
          DEFAULT: "#F5F7FB",
          elevated: "#FFFFFF",
          dark: "#0B1220",
        },
      },
      borderRadius: {
        control: "12px",
        sheet: "20px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
