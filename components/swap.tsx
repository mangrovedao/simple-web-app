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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

function getTokenByAddress(
  address: string,
  markets: ReturnType<typeof useMarkets>
): Token | undefined {
  const token =
    markets.find((m) => m.base.address === address)?.base ??
    markets.find((m) => m.quote.address === address)?.quote;
  return token;
}

function getAllTokens(markets: ReturnType<typeof useMarkets>): Token[] {
  return markets.reduce<Token[]>((acc, market) => {
    if (!acc.some((t) => t.address === market.base.address)) {
      acc.push(market.base);
    }
    if (!acc.some((t) => t.address === market.quote.address)) {
      acc.push(market.quote);
    }
    return acc;
  }, []);
}

function getTradableTokens({
  markets,
  token,
}: {
  markets: ReturnType<typeof useMarkets>;
  token?: Token;
}): Token[] {
  if (!token) return [];
  return markets.reduce<Token[]>((acc, market) => {
    if (
      market.base.address === token.address &&
      !acc.some((t) => t.address === market.quote.address)
    ) {
      acc.push(market.quote);
    }
    if (
      market.quote.address === token.address &&
      !acc.some((t) => t.address === market.base.address)
    ) {
      acc.push(market.base);
    }
    return acc;
  }, []);
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

  const allTokens = getAllTokens(markets);
  const tradableTokens = getTradableTokens({
    markets,
    token: payToken,
  });
  const [payTokenDialogOpen, setPayTokenDialogOpen] = React.useState(false);
  const [receiveTokenDialogOpen, setReceiveTokenDialogOpen] =
    React.useState(false);

  function onPayTokenSelected(token: Token) {
    const newTradableTokens = getTradableTokens({ markets, token });
    setPayTknAddress(token.address);
    setPayTokenDialogOpen(false);
    if (newTradableTokens.length === 1) {
      setReceiveTknAddress(newTradableTokens[0].address);
      return;
    }
    setReceiveTknAddress("");
  }

  function onReceiveTokenSelected(token: Token) {
    setReceiveTknAddress(token.address);
    setReceiveTokenDialogOpen(false);
  }

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
    tradableTokens,
    allTokens,
    payTokenDialogOpen,
    setPayTokenDialogOpen,
    receiveTokenDialogOpen,
    setReceiveTokenDialogOpen,
    onPayTokenSelected,
    onReceiveTokenSelected,
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
    allTokens,
    tradableTokens,
    payTokenDialogOpen,
    setPayTokenDialogOpen,
    receiveTokenDialogOpen,
    setReceiveTokenDialogOpen,
    onPayTokenSelected,
    onReceiveTokenSelected,
  } = useSwap();
  return (
    <>
      <h1 className="text-3xl text-center mt-20 mb-6">Swap</h1>
      <div className="px-4  space-y-1 relative">
        <TokenContainer
          type="pay"
          token={payToken}
          value={fields.payValue}
          onChange={onPayValueChange}
          onTokenClicked={() => setPayTokenDialogOpen(true)}
        />
        <Button
          onClick={reverseTokens}
          className="absolute left-1/2 -translate-y-1/2 -translate-x-1/2"
        >
          <MoveVertical />
        </Button>
        <TokenContainer
          type="receive"
          token={receiveToken}
          value={fields.receiveValue}
          onChange={onReceiveValueChange}
          onTokenClicked={() => setReceiveTokenDialogOpen(true)}
        />
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
      <TokenSelectorDialog
        open={payTokenDialogOpen}
        tokens={allTokens}
        onSelect={onPayTokenSelected}
        onOpenChange={setPayTokenDialogOpen}
      />
      <TokenSelectorDialog
        open={receiveTokenDialogOpen}
        tokens={tradableTokens}
        onSelect={onReceiveTokenSelected}
        onOpenChange={setReceiveTokenDialogOpen}
      />
    </>
  );
}

function TokenSelectorDialog({
  tokens,
  onSelect,
  open = false,
  onOpenChange,
}: {
  open?: boolean;
  tokens: Token[];
  onSelect: (token: Token) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
        </DialogHeader>
        <ul className="mt-6 flex flex-col space-y-4">
          {tokens.map((token) => (
            <li key={token.address}>
              <Button
                onClick={() => onSelect(token)}
                className="px-2 py-1 border rounded-lg text-sm flex items-center space-x-1"
              >
                <TokenIcon symbol={token.symbol} />
                <span className="font-semibold text-lg">{token.symbol}</span>
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

type TokenContainerProps = {
  token?: Token;
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
          {token ? (
            <Button
              onClick={onTokenClicked}
              className="px-2 py-1 border border-green-caribbean rounded-lg text-sm flex items-center space-x-1"
            >
              <TokenIcon symbol={token.symbol} />
              <span className="font-semibold text-lg text-nowrap">
                {token.symbol}
              </span>
              <ChevronDown className="w-3" />
            </Button>
          ) : (
            <Button onClick={onTokenClicked} className="text-nowrap">
              Select token
            </Button>
          )}
        </span>
      </div>
      <div className="text-xs text-right opacity-70">
        {token ? (
          <>
            Balance: <span>{tokenBalance.formattedWithSymbol}</span>{" "}
          </>
        ) : null}
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
