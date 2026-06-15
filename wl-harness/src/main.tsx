import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@electron/styles/wl-theme.css'; // real WL design tokens (--wl-*)
import './index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
