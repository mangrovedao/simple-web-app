import type { PublicMarketActions, Token } from "@mangrovedao/mgv";
import type { BS } from "@mangrovedao/mgv/lib";
import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { type TransactionReceipt, type PublicClient, formatUnits } from "viem";
import { usePublicClient, useWalletClient, useAccount } from "wagmi";

type Props = {
  onResult?: (result: TransactionReceipt) => void;
};

export function usePostMarketOrder({ onResult }: Props = {}) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const addRecentTransaction = useAddRecentTransaction();

  return useMutation({
    mutationFn: async ({
      marketClient,
      baseAmount,
      quoteAmount,
      bs,
      slippage,
      receiveToken,
      receiveValue,
      sendToken,
    }: {
      marketClient: PublicClient & PublicMarketActions;
      baseAmount: bigint;
      quoteAmount: bigint;
      bs: BS;
      slippage: number;
      receiveToken?: Token;
      receiveValue?: string;
      sendToken?: Token;
    }) => {
      try {
        if (
          !publicClient ||
          !walletClient ||
          !marketClient ||
          !address ||
          !receiveToken ||
          !receiveValue ||
          !sendToken
        ) {
          throw new Error("Market order is missing params");
        }

        const { request, takerGave, takerGot } =
          await marketClient.simulateMarketOrderByVolumeAndMarket({
            baseAmount,
            quoteAmount,
            bs,
            slippage,
            account: address,
            gas: 20_000_000n,
          });

        const formattedTakerGave = formatUnits(takerGave, sendToken.decimals);
        const formattedTakerGot = formatUnits(takerGot, receiveToken.decimals);

        const hash = await walletClient.writeContract(request);
        addRecentTransaction({
          hash,
          description: `Received: ${formattedTakerGot} ${receiveToken.symbol}\nSent: ${formattedTakerGave} ${sendToken?.symbol}`,
        });
        const { receipt, result } = await marketClient.waitForMarketOrderResult(
          {
            hash,
            bs,
            taker: address,
          }
        );
        const formattedReceiveAmount = formatUnits(
          result.takerGot,
          receiveToken.decimals
        );

        const fixedReceiveAmount = Number(
          formattedReceiveAmount
        ).toLocaleString(undefined, {
          maximumFractionDigits: receiveToken.displayDecimals,
        });

        if (receipt.status === "reverted") {
          toast.error("The transaction was reverted");
        } else {
          toast.success(
            `You successfully received ${fixedReceiveAmount} ${receiveToken.symbol}`
          );
        }

        return { hash, receipt };
      } catch (error) {
        console.error(error);
        toast.error("Failed to post the market order");
      }
    },
    onSuccess: async (data) => {
      if (data !== undefined) {
        const { receipt } = data;
        /*
         * We use a custom callback to handle the success message once it's ready.
         * This is because the onSuccess callback from the mutation will only be triggered
         * after all the preceding logic has been executed.
         */
        onResult?.(receipt);
      }
    },
  });
}
