import { createRoot } from 'react-dom/client';
import '@fontsource/dotgothic16/400.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import './ui/styles.css';
import { App } from './app/App';
import { audio } from './audio/engine';
import { ui } from './audio/sfx';
import { music } from './audio/music';

// Browsers only allow sound after the first click or key press.
window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', () => audio.unlock());
// A soft blip for every button.
document.addEventListener(
  'click',
  (e) => {
    if ((e.target as Element | null)?.closest?.('button, .choice')) ui('click');
  },
  true,
);

// Dev-only handle for checking sound from the browser console.
if (import.meta.env.DEV) (window as unknown as { __audio: unknown }).__audio = { audio, music };

createRoot(document.getElementById('root')!).render(<App />);
