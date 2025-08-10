
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Service worker registered'))
        .catch((err) => console.error('SW registration error', err));
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  return (
    
      <Component {...pageProps} />
    
  );
}
