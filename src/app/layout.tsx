import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { VersionChecker } from "@/components/layout/VersionChecker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MB Sistemas",
  description: "Sistema SaaS completo para gestão de cafeterias e restaurantes. PDV touch, controle de estoque, financeiro e muito mais.",
  keywords: ["gestão", "cafeteria", "restaurante", "PDV", "estoque", "financeiro"],
  authors: [{ name: "Sistema de Gestão" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "MB Sistemas",
    description: "Sistema SaaS completo para gestão de cafeterias e restaurantes.",
    url: "https://seu-app.vercel.app",
    siteName: "MB Sistemas",
    images: [{ url: "/logo.svg", width: 512, height: 512 }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MB Sistemas",
    description: "Sistema SaaS completo para gestão de cafeterias e restaurantes.",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <VersionChecker />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
