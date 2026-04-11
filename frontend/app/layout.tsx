// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/Confirm';

export const metadata: Metadata = {
  title: 'SIMS Pro – School Information Management System',
  description: 'Guru Nanak Public Senior Secondary School – Comprehensive School Management Portal',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-navy-800 text-white antialiased">
        {children}
        <ToastProvider />
        <ConfirmProvider />
      </body>
    </html>
  );
}
