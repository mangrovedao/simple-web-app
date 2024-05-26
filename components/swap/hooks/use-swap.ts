import {
  marketOrderSimulation,
  publicMarketActions,
  type Token,
} from "@mangrovedao/mgv";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import React from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useQueryState } from "nuqs";
import { formatUnits, parseEther, parseUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { BS, type MarketOrderSimulationParams } from "@mangrovedao/mgv/lib";

import { useMangroveAddresses, useMarkets } from "@/hooks/use-addresses";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenByAddress } from "./use-token-by-address";
import { getAllTokens, getMarketFromTokens, getTradableTokens } from "../utils";

export function useSwap() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
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
  const marketClient =
    addresses && currentMarket
      ? publicClient?.extend(publicMarketActions(addresses, currentMarket))
      : undefined;

  const hasEnoughBalance =
    (payTokenBalance.balance ?? 0n) >=
    parseUnits(fields.payValue, payToken?.decimals ?? 18);

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

  const getBookQuery = useQuery({
    queryKey: ["getBook", marketClient],
    queryFn: () => {
      if (!marketClient) return null;
      return marketClient.getBook({
        depth: 50n,
      });
    },
    refetchInterval: 10_000,
    enabled: !!marketClient,
  });

  const simulateQuery = useQuery({
    queryKey: [
      "marketOrderSimulation",
      payToken?.address,
      receiveToken?.address,
      currentMarket?.base.address,
      currentMarket?.quote.address,
      fields.payValue,
      marketClient,
      address,
    ],
    queryFn: async () => {
      const book = getBookQuery.data;
      if (!(payToken && fields.payValue && book && marketClient && address))
        return null;
      const isBasePay = currentMarket?.base.address === payToken?.address;
      const params: MarketOrderSimulationParams = isBasePay
        ? {
            base: parseUnits(fields.payValue, payToken.decimals),
            bs: BS.buy,
            book,
          }
        : {
            quote: parseUnits(fields.payValue, payToken.decimals),
            bs: BS.buy,
            book,
          };

      const simulation = await marketOrderSimulation(params);
      setFields((fields) => ({
        ...fields,
        receiveValue: formatUnits(
          isBasePay ? simulation.quoteAmount : simulation.baseAmount,
          receiveToken?.decimals ?? 18
        ),
      }));

      const [approvalStep] = await marketClient.getMarketOrderSteps({
        bs: isBasePay ? BS.sell : BS.buy,
        user: address,
      });

      return { simulation, approvalStep };
    },
    enabled:
      !!payToken &&
      !!receiveToken &&
      !!fields.payValue &&
      !!getBookQuery.data &&
      !!marketClient &&
      !!address,
  });

  const hasToApprove = simulateQuery.data?.approvalStep?.done === false;

  const swapButtonText = !hasEnoughBalance
    ? "Insufficient balance"
    : fields.payValue === ""
    ? "Enter Pay amount"
    : hasToApprove
    ? `Approve ${payToken?.symbol}`
    : "Swap";

  // slippage -> valeur en % dans marketOrderSimulation -> min slippage + petit % genre x1,1
  // gas estimate -> gas limit à hardcoder (20 000 000) pr le moment,
  //

  async function swap() {
    if (!(marketClient && address && walletClient)) return;
    const isBasePay = currentMarket?.base.address === payToken?.address;
    const baseAmount = parseEther(fields.payValue);
    const quoteAmount = parseEther(fields.receiveValue);
    const { takerGot, takerGave, bounty, feePaid, request } =
      await marketClient.simulateMarketOrderByVolumeAndMarket({
        baseAmount,
        quoteAmount,
        bs: isBasePay ? BS.sell : BS.buy,
        slippage: 0.05, // 5% slippage
        account: address,
      });
    console.log({ takerGot, takerGave, bounty, feePaid, request });
    const tx = await walletClient.writeContract(request);
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
    swapButtonText,
  };
}
