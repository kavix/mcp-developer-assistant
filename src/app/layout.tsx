import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MCP Developer Assistant | AI Error Diagnosis via MCP + Bedrock',
  description:
    'Developer-focused AI error diagnosis powered by Model Context Protocol (MCP) and Amazon Bedrock on AWS Amplify',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
