import type {Metadata} from 'next';
import { Geist } from 'next/font/google'; // Use Geist instead of Inter
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const geistSans = Geist({ // Changed from Inter to Geist
  variable: '--font-geist-sans',
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: 'Dardasha AI', // Updated app title
  description: 'A simple AI Chatbot built with Next.js and Gemini API', // Updated app description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
