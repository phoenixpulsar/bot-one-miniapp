import { Cell, Address } from "@ton/core";

/**
 * Extracts the transaction hash from a BOC (Bag of Cells) string.
 * The BOC returned by tonConnectUI.sendTransaction() contains the serialized
 * transaction data. This function parses it and computes the actual transaction hash.
 *
 * @param boc - Base64 encoded BOC string from sendTransaction result
 * @returns The transaction hash as a hex string
 */
export function extractTransactionHash(boc: string): string {
  const cell = Cell.fromBase64(boc);
  const hashBuffer = cell.hash();
  return hashBuffer.toString("hex");
}

/**
 * Converts a TON address to raw format (workchain:hex).
 * This ensures consistent address format when communicating with the backend,
 * as the TON API returns addresses in raw format.
 *
 * @param address - TON address in any format (user-friendly or raw)
 * @returns The address in raw format (e.g., "0:abc123...")
 */
export function toRawAddress(address: string): string {
  try {
    const parsed = Address.parse(address);
    return parsed.toRawString();
  } catch {
    // If parsing fails, return the original address
    return address;
  }
}
