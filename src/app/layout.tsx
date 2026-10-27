import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_KR, Rajdhani } from "next/font/google";
import "./globals.css";

// Variable names match the fallbacks in src/styles/hud.css.
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "600"],
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Helldivers Dashboard",
  description:
    "헬다이버즈 2 은하 전쟁 현황, 주요 명령, 뉴스와 통계를 한국어로 모아 보는 비공식 팬 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${rajdhani.variable} ${jetbrainsMono.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
