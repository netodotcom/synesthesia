import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synesthesia",
  description: "Caleidoscópios psicodélicos gerados por código, reativos a áudio.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
