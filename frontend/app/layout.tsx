import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevAlign AI — System Foundation',
  description: 'Explainable AI-Based Developer Recommendation and Workload Balancing System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
