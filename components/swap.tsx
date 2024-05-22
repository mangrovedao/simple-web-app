"use client";

import React from "react";
import type { Token } from "@mangrovedao/mgv";
import { MoveVertical } from "lucide-react";
import { useQueryState } from "nuqs";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { TokenIcon } from "./token-icon";
import { ChevronDown } from "@/svgs";
import { useMarkets } from "@/hooks/use-addresses";
import { useTokenBalance } from "@/hooks/use-token-balance";

function getTokenByAddress(
  address: string,
  markets: ReturnType<typeof useMarkets>
): Token | undefined {
  const token =
    markets.find((m) => m.base.address === address)?.base ??
    markets.find((m) => m.quote.address === address)?.quote;
  return token;
}

function useTokenByAddress(address: string): Token | undefined {
  const markets = useMarkets();
  return getTokenByAddress(address, markets);
}

function useSwap() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const markets = useMarkets();
  const [payTknAddress, setPayTknAddress] = useQueryState("payTkn", {
    defaultValue: markets[0].base.address,
  });
  const [receiveTknAddress, setReceiveTknAddress] = useQueryState(
    "receiveTkn",
    {
      defaultValue: markets[0].quote.address,
    }
  );
  const [fields, setFields] = React.useState({
    payValue: "",
    receiveValue: "",
  });
  const payToken = useTokenByAddress(payTknAddress);
  const receiveToken = useTokenByAddress(receiveTknAddress);
  const payTokenBalance = useTokenBalance(payToken);

  const hasEnoughBalance = Number(
    formatUnits(payTokenBalance.balance ?? 0n, payToken?.decimals ?? 18)
  );

  const isSwapDisabled = !payToken || !receiveToken || !hasEnoughBalance;

  // slippage -> valeur en % dans marketOrderSimulation -> min slippage + petit % genre x1,1
  // gas estimate -> gas limit à hardcoder (20 000 000) pr le moment,
  //

  function swap() {}

  function reverseTokens() {
    setPayTknAddress(receiveTknAddress);
    setReceiveTknAddress(payTknAddress);
    setFields((fields) => ({
      payValue: fields.receiveValue,
      receiveValue: fields.payValue,
    }));
  }

  function onPayValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFields((fields) => ({ ...fields, payValue: e.target.value }));
  }

  function onReceiveValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFields((fields) => ({ ...fields, receiveValue: e.target.value }));
  }

  return {
    payToken,
    receiveToken,
    reverseTokens,
    fields,
    onPayValueChange,
    onReceiveValueChange,
    isConnected,
    openConnectModal,
    isSwapDisabled,
    swap,
  };
}

export default function Swap() {
  const {
    payToken,
    receiveToken,
    reverseTokens,
    fields,
    onPayValueChange,
    onReceiveValueChange,
    openConnectModal,
    isConnected,
    isSwapDisabled,
    swap,
  } = useSwap();
  return (
    <>
      <h1 className="text-3xl text-center mt-20 mb-6">Swap</h1>
      <div className="px-4  space-y-1 relative">
        {payToken ? (
          <TokenContainer
            type="pay"
            token={payToken}
            value={fields.payValue}
            onChange={onPayValueChange}
          />
        ) : null}
        <Button
          onClick={reverseTokens}
          className="absolute left-1/2 -translate-y-1/2 -translate-x-1/2"
        >
          <MoveVertical />
        </Button>
        {receiveToken ? (
          <TokenContainer
            type="receive"
            token={receiveToken}
            value={fields.receiveValue}
            onChange={onReceiveValueChange}
          />
        ) : null}
        {!isConnected ? (
          <Button
            className="w-full rounded-md text-xl"
            size={"lg"}
            onClick={openConnectModal}
          >
            Connect wallet
          </Button>
        ) : (
          <Button
            className="w-full rounded-md text-xl"
            size={"lg"}
            onClick={swap}
            disabled={isSwapDisabled}
          >
            Swap
          </Button>
        )}
      </div>
    </>
  );
}

type TokenContainerProps = {
  token: Token;
  type: "pay" | "receive";
  value: string;
  onTokenClicked?: () => void;
  onMaxClicked?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function TokenContainer({
  token,
  type,
  onTokenClicked,
  onMaxClicked,
  value,
  onChange,
}: TokenContainerProps) {
  const tokenBalance = useTokenBalance(token);
  return (
    <div className="flex bg-primary-solid-black rounded-md px-6 py-4 flex-col border border-transparent transition-all focus-within:border-green-caribbean">
      <label className="text-sm opacity-70">
        {type === "pay" ? "You pay" : "You receive"}
      </label>
      <div className="flex items-center space-x-2">
        <Input
          aria-label="You pay"
          className="border-none outline-none p-0 text-3xl"
          placeholder="0"
          value={value}
          onChange={onChange}
        />
        <span>
          <Button
            onClick={onTokenClicked}
            className="px-2 py-1 border border-green-caribbean rounded-lg text-sm flex items-center space-x-1"
          >
            <TokenIcon symbol={token.symbol} />
            <span className="font-semibold text-lg">{token.symbol}</span>
            <ChevronDown className="w-3" />
          </Button>
        </span>
      </div>
      <div className="text-xs text-right opacity-70">
        Balance: <span>{tokenBalance.formattedWithSymbol}</span>{" "}
        {tokenBalance.balance && type === "pay" && (
          <Button
            variant={"link"}
            onClick={onMaxClicked}
            className="text-green-caribbean hover:opacity-80 transition-all px-0 ml-1 text-sm"
          >
            Max
          </Button>
        )}
      </div>
    </div>
  );
}
