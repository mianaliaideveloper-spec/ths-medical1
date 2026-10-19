import type { Metadata } from "next";
import { StoreProvider } from "@/components/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taleem-o-Hunar Medical Center | Medicine Store",
  description: "Central inventory for the Taleem-o-Hunar Medical Center pharmacy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
