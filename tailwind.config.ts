import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bd-bg': '#2a2a2a',
        'bd-bg-secondary': '#303030',
        'bd-card': '#363636',
        'bd-card-hover': '#3d3d3d',
        'bd-accent': '#CCFF00',
        'bd-accent-dim': 'rgba(204, 255, 0, 0.08)',
        'bd-accent-medium': 'rgba(204, 255, 0, 0.15)',
        'bd-text': '#FFFFFF',
        'bd-text-secondary': '#aaaaaa',
        'bd-text-body': '#cccccc',
        'bd-text-muted': '#888888',
        'bd-border': 'rgba(255, 255, 255, 0.08)',
        'bd-border-accent': 'rgba(204, 255, 0, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'bd': '16px',
      },
    },
  },
  plugins: [],
};
export default config;
