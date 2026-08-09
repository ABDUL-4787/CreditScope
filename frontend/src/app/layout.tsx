import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navigation from '@/components/Navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CreditScope — AI-Powered Credit Risk Platform',
  description: 'Production-style credit risk scoring engine with Reject Inference, Calibration, TreeSHAP explanations, SQL logging, PSI drift tracking, and fairness monitoring.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-white">
      <body className={`${inter.className} min-h-screen flex flex-col text-gray-900 bg-white`}>
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white py-6">
          <div className="mx-auto max-w-7xl px-4 text-center text-xs text-gray-500 sm:px-6 lg:px-8">
            CreditScope is a portfolio ML Engineering demonstration project using synthetic data.
          </div>
        </footer>
      </body>
    </html>
  );
}
