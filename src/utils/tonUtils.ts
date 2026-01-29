import { Cell } from "@ton/core";

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
