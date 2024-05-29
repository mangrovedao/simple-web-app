import type { PublicMarketActions } from "@mangrovedao/mgv";
import type { BS } from "@mangrovedao/mgv/lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type TransactionReceipt, parseEther } from "viem";
import { usePublicClient, useWalletClient, useAccount } from "wagmi";

type Props = {
  onResult?: (result: TransactionReceipt) => void;
};

export function usePostMarketOrder({ onResult }: Props = {}) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { isConnected, address } = useAccount();

  return useMutation({
    mutationFn: async ({
      marketClient,
      baseAmount,
      quoteAmount,
      bs,
      slippage,
    }: {
      marketClient: ReturnType<typeof usePublicClient> & PublicMarketActions;
      baseAmount: bigint;
      quoteAmount: bigint;
      bs: BS;
      slippage: number;
    }) => {
      try {
        if (!publicClient || !walletClient || !marketClient) {
          throw new Error("Market order is missing params");
        }

        console.log({
          baseAmount,
          quoteAmount,
        });

        const { takerGot, takerGave, bounty, feePaid, request } =
          await marketClient.simulateMarketOrderByVolumeAndMarket({
            baseAmount,
            quoteAmount,
            bs,
            slippage,
            account: address,
          });

        const hash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
        });
        //note:  might need to remove marketOrderResultfromlogs function if simulateMarketOrder returns correct values
        // const result = marketOrderResultFromLogs(
        //   { ...addresses, ...market },
        //   market,
        //   {
        //     logs: receipt.logs,
        //     taker: walletClient.account.address,
        //     bs,
        //   }
        // );

        // successToast(TradeMode.MARKET, bs, base, gives, result);
        // return { result, receipt };
      } catch (error) {
        console.error(error);
        // toast.error("Failed to post the market order");
      }
    },
    meta: {
      error: "Failed to post the market order",
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
