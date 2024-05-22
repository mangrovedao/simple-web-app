import type { useMarkets } from "@/hooks/use-addresses";
import type { Token } from "@mangrovedao/mgv";

export function getTokenByAddress(
  address: string,
  markets: ReturnType<typeof useMarkets>
): Token | undefined {
  const token =
    markets.find((m) => m.base.address === address)?.base ??
    markets.find((m) => m.quote.address === address)?.quote;
  return token;
}

export function getAllTokens(markets: ReturnType<typeof useMarkets>): Token[] {
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

export function getTradableTokens({
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

export function getMarketFromTokens(
  markets: ReturnType<typeof useMarkets>,
  base: Token | undefined,
  quote: Token | undefined
) {
  if (!base || !quote) return null;
  return markets.find(
    (m) =>
      (m.base.address === base.address && m.quote.address === quote.address) ||
      (m.base.address === quote.address && m.quote.address === base.address)
  );
}
