import daisyui from 'daisyui';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ph: {
          orange: '#FF6154',
          'orange-dark': '#E54D42',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        phdark: {
          'primary': '#FF6154',
          'secondary': '#FF8A7A',
          'accent': '#FFD700',
          'neutral': '#1A1A2E',
          'base-100': '#0F0F1A',
          'base-200': '#1A1A2E',
          'base-300': '#252542',
          'info': '#38BDF8',
          'success': '#22C55E',
          'warning': '#F59E0B',
          'error': '#EF4444',
        },
      },
    ],
    darkTheme: 'phdark',
  },
};
