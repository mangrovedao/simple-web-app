import dynamic from "next/dynamic";

import Header from "@/components/header";
import { MarketProvider } from "@/providers/market";
const Swap = dynamic(() => import("../components/swap"), { ssr: false });

export default function Page() {
  return (
    <main className="flex flex-col min-h-screen max-w-xl mx-auto">
      <Header />
      <MarketProvider>
        <Swap />
      </MarketProvider>
    </main>
  );
}
