import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RoomProvider } from "@/hooks/useRoom";
import localFont from "next/font/local";

const monocraft = localFont({
  src: [
    {
      path: "./fonts/Monocraft-Black.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Monocraft-Light.ttf",
      weight: "200",
      style: "light",
    },
    {
      path: "./fonts/Monocraft-Bold.ttf",
      weight: "700",
      style: "bold",
    },
    {
      path: "./fonts/Monocraft-Italic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/Monocraft-SemiBold.ttf",
      style: "semibold",
    },
  ],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PixelDraw.io",
  description: "Free Online Multiplayer Drawing & Guessing Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body className={`${monocraft.className} text-[#DDE6ED] antialiased`}>
        <RoomProvider>
          <main className="flex flex-col items-center justify-center h-screen">
            {children}
          </main>
        </RoomProvider>
      </body>
    </html>
  );
}
