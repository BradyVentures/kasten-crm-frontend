import type { Metadata, Viewport } from "next";
import { Lora, Lato } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "Bauelemente Kasten - CRM",
  description: "CRM System fuer Bauelemente Kasten",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#e65644",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${lora.variable} ${lato.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
