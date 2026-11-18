import "./globals.css";

export const metadata = {
  title: "Kal ya Abhi? – Tense tutor (24B3003)",
  description: "Adaptive tutor for simple past vs present perfect, ET 617 end-sem 24B3003",
};

export const viewport = { width: "device-width", initialScale: 1 };

// System fonts only (light on a budget phone and a slow connection).
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
