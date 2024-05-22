import { publicMarketActions, type Token } from "@mangrovedao/mgv";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import React from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useQueryState } from "nuqs";
import { formatUnits } from "viem";

import { useMangroveAddresses, useMarkets } from "@/hooks/use-addresses";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenByAddress } from "./use-token-by-address";
import { getAllTokens, getMarketFromTokens, getTradableTokens } from "../utils";

export function useSwap() {
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
  const currentMarket = getMarketFromTokens(markets, payToken, receiveToken);
  const publicClient = usePublicClient();
  const addresses = useMangroveAddresses();
  const client =
    addresses && currentMarket
      ? publicClient?.extend(publicMarketActions(addresses, currentMarket))
      : undefined;

  const hasEnoughBalance = Number(
    formatUnits(payTokenBalance.balance ?? 0n, payToken?.decimals ?? 18)
  );

  const isReverseDisabled = !payToken || !receiveToken;
  const isSwapDisabled =
    isReverseDisabled ||
    !hasEnoughBalance ||
    fields.payValue === "" ||
    fields.receiveValue === "";

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
    setFields(() => ({
      payValue: "",
      receiveValue: "",
    }));
    if (newTradableTokens.length === 1) {
      setReceiveTknAddress(newTradableTokens[0].address);
      return;
    }
    setReceiveTknAddress("");
  }

  function onReceiveTokenSelected(token: Token) {
    setReceiveTknAddress(token.address);
    setReceiveTokenDialogOpen(false);
    setFields(() => ({
      payValue: "",
      receiveValue: "",
    }));
  }

  function onMaxClicked() {
    setFields((fields) => ({
      ...fields,
      payValue: formatUnits(
        payTokenBalance.balance ?? 0n,
        payToken?.decimals ?? 18
      ),
    }));
  }

  // slippage -> valeur en % dans marketOrderSimulation -> min slippage + petit % genre x1,1
  // gas estimate -> gas limit à hardcoder (20 000 000) pr le moment,
  //

  async function swap() {
    if (!client) return;
    const book = await client.getBook({
      depth: 10n,
    });
    console.log(book);
  }

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
    isReverseDisabled,
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
    onMaxClicked,
  };
}