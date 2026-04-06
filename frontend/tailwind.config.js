/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#050505",
        surface: "#121212",
        "surface-light": "#1E1E1E",
        "border-color": "#2A2A2A",
        muted: "#A0A0A0",
        success: "#34C759",
        danger: "#FF3B30",
        gold: "#FFD700",
      },
      fontFamily: {
        playfair: ["PlayfairDisplay_600SemiBold"],
        sans: ["DMSans_400Regular"],
        "sans-medium": ["DMSans_500Medium"],
        "sans-bold": ["DMSans_700Bold"],
      },
    },
  },
  plugins: [],
};
