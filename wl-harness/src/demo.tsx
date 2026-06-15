import { createRoot } from 'react-dom/client';

import '@electron/styles/wl-theme.css';
import './index.css';
import { DemoFlow } from './DemoFlow';

createRoot(document.getElementById('root')!).render(<DemoFlow />);
