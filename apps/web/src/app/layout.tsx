import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

import { WalletProvider } from "@/components/wallet-provider";
import { DemoStorageBanner } from "@/components/DemoStorageBanner";
import { HeaderBalance } from "@/components/HeaderBalance";
import { BottomNav } from "@/components/BottomNav";
import { MiniPayBanner } from "@/components/MiniPayGuard";
import { WelcomeUsdmBanner } from "@/components/WelcomeUsdmBanner";
import { MinipayFeeTestBanner } from "@/components/MinipayFeeTestBanner";
import { MINIPAY_FEE_TEST } from "@/lib/minipay-fee-test";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TaskPay — Earn digital pesos for real tasks",
  description:
    "Post and complete micro-tasks with COPm rewards. Built for MiniPay on Celo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${inter.variable} font-body`}>
        <WalletProvider>
          <div className="relative flex min-h-screen flex-col">
            <MiniPayBanner />
            <MinipayFeeTestBanner />
            {!MINIPAY_FEE_TEST && <WelcomeUsdmBanner />}
            <DemoStorageBanner />
            <HeaderBalance />
            <main className="flex-1">{children}</main>
            <BottomNav />
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
