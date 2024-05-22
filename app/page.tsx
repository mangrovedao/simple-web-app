import Header from "@/components/header";
import Swap from "@/components/swap";

export default function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <main className="flex flex-col min-h-screen max-w-xl mx-auto">
      <Header />
      <Swap />
    </main>
  );
}
