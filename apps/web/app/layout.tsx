import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BYR Achieve · 镜像论坛",
  description:
    "围绕北邮人论坛镜像行为构建的论坛沙盒：机器人作为一等参与者，匿名通知由订阅驱动。",
};

const themeBootstrap = `(() => {
  try {
    const saved = window.localStorage.getItem('byr-achieve.theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = saved === 'dark' || saved === 'light'
      ? saved
      : prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', mode);
  } catch { /* ignore */ }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${inter.variable} ${notoSansSC.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the theme before paint to avoid FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
