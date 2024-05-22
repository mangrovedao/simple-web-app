import { MangroveLogo } from "@/svgs";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import React from "react";

export default function Header() {
  return (
    <div className="w-full px-4 py-5 flex justify-between h-20">
      <MangroveLogo />
      <ConnectButton />
    </div>
  );
}
