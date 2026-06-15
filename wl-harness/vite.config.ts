import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Path to a checkout of the-kodara/kodara. The harness renders the REAL WL plan
// components straight from this repo, so set KODARA_REPO if it lives elsewhere.
const KODARA = process.env.KODARA_REPO || 'C:/tmp/kodara-review';
const EL = path.join(KODARA, 'apps/electron/src');
// The real component files live outside this project, so their bare imports must
// be pointed back at the harness's installed copies.
const nm = (p: string) => path.resolve(__dirname, 'node_modules', p);

// Intercept the relative `./useOpenWLPlanTaskChat` import inside WLTaskRow
// (alias only catches the `@electron/...` form) and swap in the no-op mock.
const mockOpenChat = {
  name: 'mock-open-chat',
  enforce: 'pre' as const,
  resolveId(source: string) {
    if (source.endsWith('useOpenWLPlanTaskChat')) {
      return path.resolve(__dirname, 'src/mocks/useOpenWLPlanTaskChat.ts');
    }
    return null;
  },
};

export default defineConfig({
  base: './',
  plugins: [mockOpenChat, react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      // mock only the data layer + navigation; everything else is the real component
      { find: '@electron/lib/trpc/client', replacement: path.resolve(__dirname, 'src/mocks/trpcClient.ts') },
      { find: '@electron/components/plans/useOpenWLPlanTaskChat', replacement: path.resolve(__dirname, 'src/mocks/useOpenWLPlanTaskChat.ts') },
      { find: '@electron', replacement: EL },
      // type-only imports (stripped by esbuild); alias for safety
      { find: /^@api\/.*/, replacement: path.resolve(__dirname, 'src/mocks/empty.ts') },
      // resolve third-party deps used by the real components from here
      { find: /^react$/, replacement: nm('react') },
      { find: /^react\/jsx-runtime$/, replacement: nm('react/jsx-runtime') },
      { find: /^react\/jsx-dev-runtime$/, replacement: nm('react/jsx-dev-runtime') },
      { find: /^react-dom$/, replacement: nm('react-dom') },
      { find: /^react-dom\/client$/, replacement: nm('react-dom/client') },
      { find: 'lucide-react', replacement: nm('lucide-react') },
      { find: 'recharts', replacement: nm('recharts') },
      { find: 'date-fns', replacement: nm('date-fns') },
      { find: 'clsx', replacement: nm('clsx') },
      { find: 'tailwind-merge', replacement: nm('tailwind-merge') },
    ],
  },
});
