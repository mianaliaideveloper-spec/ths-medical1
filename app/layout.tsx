import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { StoreProvider } from "@/components/store";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taleem-o-Hunar Medical Center | Medicine Store",
  description: "Central inventory for the Taleem-o-Hunar Medical Center pharmacy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
