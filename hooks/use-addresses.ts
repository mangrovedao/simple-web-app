import {
  arbitrumMangrove,
  blastMangrove,
  blastMarkets,
  arbitrumMarkets,
} from "@mangrovedao/mgv/addresses";
import { blast, arbitrum } from "viem/chains";
import { useChainId } from "wagmi";

export function useMangroveAddresses() {
  const chain = useChainId();
  switch (chain) {
    case arbitrum.id:
      return arbitrumMangrove;
    case blast.id:
      return blastMangrove;
    default:
      return undefined;
  }
}

export function useMarkets() {
  const chain = useChainId();
  switch (chain) {
    case blast.id:
      return blastMarkets;
    case arbitrum.id:
      return arbitrumMarkets;
    default:
      return [];
  }
}
