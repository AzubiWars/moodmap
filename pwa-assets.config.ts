import { defineConfig } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: {
      sizes: [192, 512],
      favicons: [[48, 'favicon.ico']],
    },
    maskable: { sizes: [512], padding: 0.2, resizeOptions: { background: '#2B78B8' } },
    apple: { sizes: [180], padding: 0.1, resizeOptions: { background: '#2B78B8' } },
  },
  images: ['public/favicon.svg'],
});
