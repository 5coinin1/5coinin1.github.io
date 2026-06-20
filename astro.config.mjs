// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

// https://astro.build/config
// User page (5coinin1.github.io) is served at the domain root,
// so no `base` is needed. `site` is used for canonical URLs / sitemap.
export default defineConfig({
  site: 'https://5coinin1.github.io',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [mdx()],
});
