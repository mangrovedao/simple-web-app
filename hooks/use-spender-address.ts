import { useMangroveAddresses } from "@/hooks/use-addresses";
import { getUserRouter } from "@mangrovedao/mgv/actions";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "viem";
import { useAccount, usePublicClient } from "wagmi";

export const useSpenderAddress = (
  type: "kandel" | "limit" | "market" | "amplified"
) => {
  const addresses = useMangroveAddresses();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  return useQuery({
    queryKey: ["spenderAddress", type, addresses, address, publicClient],
    queryFn: async () => {
      if (!addresses) return null;
      if (type === "market") {
        return addresses.mgv;
      }
      if (!publicClient || !address) return null;
      return await getUserRouter(publicClient as Client, addresses, {
        user: address,
      });
    },
    enabled: !!addresses?.mgv,
  });
};
