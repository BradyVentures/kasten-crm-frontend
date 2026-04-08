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
        'bd-bg': '#ffffff',
        'bd-bg-secondary': '#f8f8fb',
        'bd-card': '#ffffff',
        'bd-card-hover': '#f8f8fb',
        'bd-accent': '#e65644',
        'bd-accent-dim': 'rgba(230, 86, 68, 0.08)',
        'bd-accent-medium': 'rgba(230, 86, 68, 0.15)',
        'bd-text': '#010101',
        'bd-text-secondary': '#555555',
        'bd-text-body': '#333333',
        'bd-text-muted': '#8e91aa',
        'bd-border': '#dddddd',
        'bd-border-accent': 'rgba(230, 86, 68, 0.35)',
      },
      fontFamily: {
        sans: ['Lora', 'Georgia', 'serif'],
        heading: ['Lato', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'bd': '12px',
      },
    },
  },
  plugins: [],
};
export default config;
