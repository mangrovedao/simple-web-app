import dynamic from "next/dynamic";

import Header from "@/components/header";
const Swap = dynamic(() => import("../components/swap/swap"), { ssr: false });

export default function Page() {
  return (
    <main className="flex flex-col min-h-screen max-w-xl mx-auto">
      <Header />
      <Swap />
    </main>
  );
}
