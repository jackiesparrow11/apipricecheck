import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  site: 'https://apipricecheck.com',
  output: 'static',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    preact({
      compat: true,
    }),
  ],
});
