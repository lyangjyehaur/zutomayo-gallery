import * as React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import DebugFancybox from './DebugFancybox';

const rootElement = document.getElementById('debug-root');
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <DebugFancybox />
  </StrictMode>
);
