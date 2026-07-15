/**
 * Stellar / Soroban client utilities for the StellarAid vault contract.
 *
 * These helpers assemble contract invocations (deposit, add_milestone,
 * approve_milestone) and return an *unsigned* transaction XDR string. The XDR
 * is handed to the connected wallet (Freighter) for signing, then submitted.
 *
 * NOTE ON NETWORK SUBMISSION: signing must happen in the wallet (browser
 * extension). This module builds + simulates transactions and exposes a
 * `submitSigned` helper, but the actual signature is produced by the wallet
 * (see `useStellarWallet.signTransaction`). Edges that require a live signature
 * or a funded source account are marked with TODO.
 */
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  type xdr,
} from "@stellar/stellar-sdk";

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;

export const VAULT_CONTRACT_ID = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID ?? "";

const STROOPS_PER_UNIT = 10_000_000n; // Stellar uses 7 decimals.

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/** Convert a human-entered display amount (e.g. "12.5") to stroops (bigint). */
export function toStroops(display: string | number): bigint {
  const value = typeof display === "number" ? display.toString() : display.trim();
  if (!value || Number.isNaN(Number(value))) {
    throw new Error(`Invalid amount: "${display}"`);
  }
  const [whole, fraction = ""] = value.split(".");
  const paddedFraction = (fraction + "0000000").slice(0, 7);
  return BigInt(whole || "0") * STROOPS_PER_UNIT + BigInt(paddedFraction || "0");
}

/** Convert stroops (bigint | string | number) back to a display string. */
export function fromStroops(stroops: bigint | string | number): string {
  const value = BigInt(stroops);
  const whole = value / STROOPS_PER_UNIT;
  const fraction = (value % STROOPS_PER_UNIT).toString().padStart(7, "0");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

/** Format a stroop amount as a human-friendly XLM string. */
export function formatAmount(stroops: bigint | string | number): string {
  const display = fromStroops(stroops);
  const [whole, fraction] = display.split(".");
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${withThousands}.${fraction} XLM` : `${withThousands} XLM`;
}

/** Truncate a Stellar address for display: GXXXX…YYYY. */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars + 1)}…${address.slice(-chars)}`;
}

/* ------------------------------------------------------------------ */
/* Client construction                                                 */
/* ------------------------------------------------------------------ */

/** Build a Soroban RPC server bound to NEXT_PUBLIC_RPC_URL. */
export function getServer(): rpc.Server {
  return new rpc.Server(RPC_URL, {
    allowHttp: RPC_URL.startsWith("http://"),
  });
}

/** A Contract wrapper for the configured vault id. */
export function getVaultContract(): Contract {
  if (!VAULT_CONTRACT_ID) {
    throw new Error(
      "NEXT_PUBLIC_VAULT_CONTRACT_ID is not set — cannot build a contract invocation.",
    );
  }
  return new Contract(VAULT_CONTRACT_ID);
}

/* ------------------------------------------------------------------ */
/* Transaction assembly                                                */
/* ------------------------------------------------------------------ */

async function buildInvocation(
  sourcePublicKey: string,
  operation: xdr.Operation,
): Promise<string> {
  const server = getServer();
  // Load the source account sequence from the network.
  const account: Account = await server.getAccount(sourcePublicKey);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  // Simulate to obtain the Soroban resource footprint, then prepare the tx.
  // `prepareTransaction` returns a new, assembled transaction ready to sign.
  tx = await server.prepareTransaction(tx);

  return tx.toXDR();
}

/** Build (and simulate) a `deposit(from, amount)` invocation. Returns unsigned XDR. */
export async function buildDepositTx(params: {
  from: string;
  amountDisplay: string | number;
}): Promise<string> {
  const { from, amountDisplay } = params;
  const contract = getVaultContract();
  const amount = toStroops(amountDisplay);

  const op = contract.call(
    "deposit",
    Address.fromString(from).toScVal(),
    nativeToScVal(amount, { type: "i128" }),
  );

  return buildInvocation(from, op);
}

/** Build (and simulate) an `add_milestone(...)` invocation. Returns unsigned XDR. */
export async function buildAddMilestoneTx(params: {
  admin: string;
  title: string;
  description: string;
  amountDisplay: string | number;
  recipient: string;
}): Promise<string> {
  const { admin, title, description, amountDisplay, recipient } = params;
  const contract = getVaultContract();
  const amount = toStroops(amountDisplay);

  const op = contract.call(
    "add_milestone",
    Address.fromString(admin).toScVal(),
    nativeToScVal(title, { type: "string" }),
    nativeToScVal(description, { type: "string" }),
    nativeToScVal(amount, { type: "i128" }),
    Address.fromString(recipient).toScVal(),
  );

  return buildInvocation(admin, op);
}

/** Build (and simulate) an `approve_milestone(signer, milestone_id)` invocation. */
export async function buildApproveMilestoneTx(params: {
  signer: string;
  milestoneId: number | string;
}): Promise<string> {
  const { signer, milestoneId } = params;
  const contract = getVaultContract();

  const op = contract.call(
    "approve_milestone",
    Address.fromString(signer).toScVal(),
    nativeToScVal(Number(milestoneId), { type: "u32" }),
  );

  return buildInvocation(signer, op);
}

/* ------------------------------------------------------------------ */
/* Submission                                                          */
/* ------------------------------------------------------------------ */

export interface SubmitResult {
  hash: string;
  status: string;
}

/**
 * Submit a wallet-signed transaction XDR to the network and poll for its result.
 * Returns the transaction hash — used as the `tx_hash` recorded by the backend.
 *
 * TODO: For high-value flows, surface intermediate PENDING states to the UI and
 * add a longer, cancellable poll window.
 */
export async function submitSigned(signedXdr: string): Promise<SubmitResult> {
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sendResponse = await server.sendTransaction(tx);
  if (sendResponse.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(sendResponse.errorResult)}`,
    );
  }

  const hash = sendResponse.hash;

  // Poll for completion (testnet is usually a few seconds).
  let attempts = 0;
  // eslint-disable-next-line no-constant-condition
  while (attempts < 20) {
    const result = await server.getTransaction(hash);
    if (result.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
      return { hash, status: result.status };
    }
    attempts += 1;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Not yet confirmed — return the hash anyway; caller can re-check.
  return { hash, status: "PENDING" };
}

/** Decode an ScVal returned from a read-only simulation into a JS value. */
export function decodeScVal<T = unknown>(value: xdr.ScVal): T {
  return scValToNative(value) as T;
}

// TODO: Review performance constraints here (Ref: 40f25f2c - 1784118937)
