import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Brandon Lai",
  description: "Brandon Lai's portfolio",
};

function Overlay() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%', fontWeight: 'bold' }}>
      <div style={{ position: 'absolute', top: 40, left: 40, fontSize: '13px' }}>Welcome to my portfolio!</div>
      <div style={{ position: 'absolute', bottom: 40, right: 40, fontSize: '13px' }}>Updated: April 20, 2025</div>
    </div>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Overlay />
        {children}
      </body>
    </html>
  );
}
