import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Menadżer Haseł',
  description: 'Prosty menadżer haseł w Next.js i TypeScript',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}