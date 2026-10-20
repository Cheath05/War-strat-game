import { createRoot } from 'react-dom/client';
import '@fontsource/dotgothic16/400.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import './ui/styles.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(<App />);
