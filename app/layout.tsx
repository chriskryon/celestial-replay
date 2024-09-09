import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";

import clsx from "clsx";
import Image from "next/image";
import { Analytics } from "@vercel/analytics/react";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Navbar } from "@/components/navbar";
import Starfield from "@/components/Starfield";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen font-sans antialiased",
          fontSans.variable,
          "relative",
        )}
      >
        <div className="fixed top-0 left-0 w-full h-full">
          <Image
            alt="Background Image"
            className=""
            layout="fill"
            objectFit="cover"
            quality={100}
            src="/bg.jpg"
            style={{ backgroundSize: "cover" }} // Add this line
          />
        </div>
        <Starfield
          backgroundColor="black"
          speedFactor={0.05}
          starColor={[255, 255, 255]}
          starCount={3690}
        />
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <div className="relative flex flex-col h-screen">
            <Navbar />
            <main className="container mx-auto max-w-7xl pt-1 px-6 flex-grow">
              {children}
              <Analytics />
            </main>
            {/* <footer className="w-full flex items-center justify-center py-3">
              <Link
                isExternal
                className="flex items-center gap-1 text-current"
                href="https://nextui-docs-v2.vercel.app?utm_source=next-app-template"
                title="nextui.org homepage"
              >
                <span className="text-default-600">Powered by</span>
                <p className="text-primary">NextUI</p>
              </Link>
            </footer> */}
          </div>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
