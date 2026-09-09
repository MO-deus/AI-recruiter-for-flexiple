import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Recruiter — Sourcing Refinement Loop',
  description: 'LLM-powered candidate sourcing with iterative refinement. Search, filter, rank, and freeze a shortlist through natural-language feedback.',
  keywords: ['recruiter', 'AI sourcing', 'candidate search', 'hiring', 'talent'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
