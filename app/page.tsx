import Header from "@/components/header";
import Swap from "@/components/swap";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen max-w-xl mx-auto">
      <Header />
      <Swap />
    </main>
  );
}
