import { formatUnits } from "viem";

export function convertBigIntToNumber(value: bigint, decimals = 18): number {
  return Number(formatUnits(value ?? 0n, decimals));
}
