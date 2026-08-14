import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './context/AuthContext';

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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

