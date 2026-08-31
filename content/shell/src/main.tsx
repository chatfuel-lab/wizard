import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { migrateLegacyHash } from './lib/route';
import './index.css';

/* Before anything reads the address: links minted while this app routed in the
   fragment are still in mail and in bookmarks. */
migrateLegacyHash();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
