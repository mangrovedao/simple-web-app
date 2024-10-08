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
import { toast } from "sonner";

import { useMangroveAddresses, useMarkets } from "@/hooks/use-addresses";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenByAddress } from "../../../hooks/use-token-by-address";
import { getAllTokens, getMarketFromTokens, getTradableTokens } from "../utils";
import { useApproveToken } from "@/hooks/use-approve-token";
import { useSpenderAddress } from "@/hooks/use-spender-address";
import { usePostMarketOrder } from "@/hooks/use-post-market-order";

export function useSwap() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { openConnectModal } = useConnectModal();
  const postMarketOrder = usePostMarketOrder();
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
  const receiveTokenBalance = useTokenBalance(receiveToken);
  const currentMarket = getMarketFromTokens(markets, payToken, receiveToken);
  const publicClient = usePublicClient();
  const addresses = useMangroveAddresses();
  const approvePayToken = useApproveToken();
  const { data: spender } = useSpenderAddress("market");
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
    fields.receiveValue === "" ||
    Number.parseFloat(fields.payValue) <= 0 ||
    Number.parseFloat(fields.receiveValue) <= 0 ||
    approvePayToken.isPending ||
    postMarketOrder.isPending;

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
    queryKey: [
      "getBook",
      marketClient,
      currentMarket?.base.address,
      currentMarket?.quote.address,
    ],
    queryFn: () => {
      if (!marketClient) return null;
      return marketClient.getBook({
        depth: 50n,
      });
    },
    refetchInterval: 3_000,
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
      if (!(payToken && receiveToken && book && marketClient && address))
        return null;
      const isBasePay = currentMarket?.base.address === payToken?.address;
      const payAmount = parseUnits(fields.payValue, payToken.decimals);
      const params: MarketOrderSimulationParams = isBasePay
        ? {
            base: payAmount,
            bs: BS.sell,
            book,
          }
        : {
            quote: payAmount,
            bs: BS.buy,
            book,
          };
      const simulation = marketOrderSimulation(params);
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
      !!getBookQuery.data &&
      !!marketClient &&
      !!address,
  });

  const hasToApprove = simulateQuery.data?.approvalStep?.done === false;

  const swapButtonText = !hasEnoughBalance
    ? "Insufficient balance"
    : fields.payValue === ""
    ? "Enter Pay amount"
    : Number.parseFloat(fields.payValue) <= 0
    ? "Amount must be greater than 0"
    : approvePayToken.isPending
    ? "Approval in progress..."
    : hasToApprove
    ? `Approve ${payToken?.symbol}`
    : postMarketOrder.isPending
    ? "Processing transaction..."
    : "Swap";

  // slippage -> valeur en % dans marketOrderSimulation -> min slippage + petit % genre x1,1

  async function swap() {
    if (!(marketClient && address && walletClient && payToken)) return;

    if (hasToApprove) {
      await approvePayToken.mutate(
        {
          token: payToken,
          spender,
        },
        {
          onSuccess: () => {
            simulateQuery.refetch();
          },
        }
      );
      return;
    }

    const isBasePay = currentMarket?.base.address === payToken?.address;
    const baseAmount = isBasePay
      ? parseUnits(fields.payValue, currentMarket?.base.decimals ?? 18)
      : parseUnits(fields.receiveValue, currentMarket?.base.decimals ?? 18);
    const quoteAmount = isBasePay
      ? parseUnits(fields.receiveValue, currentMarket?.quote.decimals ?? 18)
      : parseUnits(fields.payValue, currentMarket?.quote.decimals ?? 18);
    await postMarketOrder.mutate(
      {
        marketClient,
        baseAmount,
        quoteAmount,
        bs: isBasePay ? BS.sell : BS.buy,
        slippage: 0.05,
        receiveToken,
        receiveValue: fields.receiveValue,
        sendToken: payToken,
      },
      {
        onSuccess: () => {
          setFields(() => ({
            payValue: "",
            receiveValue: "",
          }));
          payTokenBalance.refetch();
          receiveTokenBalance.refetch();
        },
      }
    );
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
