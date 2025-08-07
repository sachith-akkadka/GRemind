import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'G-Remind',
  description: 'Your intelligent location-based task manager',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />
           <link 
            rel="stylesheet" 
            href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" 
          />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
