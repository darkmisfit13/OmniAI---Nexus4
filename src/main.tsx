import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { OmniChatProvider } from './context/OmniChatContext';

createRoot(document.getElementById('root')!).render(
  <OmniChatProvider>
    <App />
  </OmniChatProvider>
);
