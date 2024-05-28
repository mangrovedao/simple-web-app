import type { Token } from "@mangrovedao/mgv";

import { useMarkets } from "@/hooks/use-addresses";
import { getTokenByAddress } from "../components/swap/utils";

export function useTokenByAddress(address: string): Token | undefined {
  const markets = useMarkets();
  return getTokenByAddress(address, markets);
}
