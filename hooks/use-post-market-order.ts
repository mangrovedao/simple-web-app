import { marketOrderResultFromLogs } from "@mangrovedao/mgv";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type TransactionReceipt, parseEther } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

type Props = {
  onResult?: (result: TransactionReceipt) => void;
};

export function usePostMarketOrder({ onResult }: Props = {}) {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return useMutation({
    mutationFn: async ({ form }: { form: Form }) => {
      try {
        if (
          !publicClient ||
          !walletClient ||
        )
          throw new Error("Market order post is missing params");

        const { base } = market;
        const { bs, send: gives, receive: wants, slippage } = form;

        const { takerGot, takerGave, bounty, feePaid, request } =
          await marketClient.simulateMarketOrderByVolumeAndMarket({
            baseAmount: parseEther(gives),
            quoteAmount: parseEther(wants),
            bs,
            slippage,
          });

        const hash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
        });
        //note:  might need to remove marketOrderResultfromlogs function if simulateMarketOrder returns correct values
        const result = marketOrderResultFromLogs(
          { ...addresses, ...market },
          market,
          {
            logs: receipt.logs,
            taker: walletClient.account.address,
            bs,
          }
        );

        // successToast(TradeMode.MARKET, bs, base, gives, result);
        return { result, receipt };
      } catch (error) {
        console.error(error);
        // toast.error("Failed to post the market order");
      }
    },
    meta: {
      error: "Failed to post the market order",
    },
    onSuccess: async (data) => {
      if (!data) return;
      const { receipt } = data;
      /*
       * We use a custom callback to handle the success message once it's ready.
       * This is because the onSuccess callback from the mutation will only be triggered
       * after all the preceding logic has been executed.
       */
      onResult?.(receipt);
      try {
        // Start showing loading state indicator on parts of the UI that depend on
        startLoading([TRADE.TABLES.ORDERS, TRADE.TABLES.FILLS]);
        await resolveWhenBlockIsIndexed.mutateAsync({
          blockNumber: Number(receipt.blockNumber),
        });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["fills"] });
      } catch (error) {
        console.error(error);
      }
    },
    onSettled: () => {
      stopLoading([TRADE.TABLES.ORDERS, TRADE.TABLES.FILLS]);
    },
  });
}
