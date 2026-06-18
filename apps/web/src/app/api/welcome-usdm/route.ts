import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia } from "viem/chains";
import {
  CELO_SEPOLIA_RPC,
  WELCOME_USDM_AMOUNT,
  getWelcomeUsdmAddress,
  normalizeWalletAddress,
} from "@/lib/welcome-usdm";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const erc20TransferAbi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

export async function POST(request: NextRequest) {
  const funderKey = process.env.WELCOME_FUNDER_PRIVATE_KEY;
  if (!funderKey) {
    return NextResponse.json(
      { error: "Welcome faucet is not configured on the server." },
      { status: 503 }
    );
  }

  let body: { address?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.address) {
    return NextResponse.json({ error: "Missing address." }, { status: 400 });
  }

  let recipient: `0x${string}`;
  try {
    recipient = normalizeWalletAddress(body.address);
  } catch {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { data: existing } = await supabase
    .from("welcome_claims")
    .select("address, tx_hash")
    .eq("address", recipient)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      status: "already_claimed",
      txHash: existing.tx_hash,
    });
  }

  const account = privateKeyToAccount(funderKey as `0x${string}`);
  const usdmAddress = getWelcomeUsdmAddress();

  const publicClient = createPublicClient({
    chain: celoSepolia,
    transport: http(CELO_SEPOLIA_RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: celoSepolia,
    transport: http(CELO_SEPOLIA_RPC),
  });

  try {
    const hash = await walletClient.writeContract({
      address: usdmAddress,
      abi: erc20TransferAbi,
      functionName: "transfer",
      args: [recipient, WELCOME_USDM_AMOUNT],
      feeCurrency: usdmAddress,
    });

    await publicClient.waitForTransactionReceipt({ hash });

    const { error: insertError } = await supabase.from("welcome_claims").insert({
      address: recipient,
      tx_hash: hash,
      amount_wei: WELCOME_USDM_AMOUNT.toString(),
    });

    if (insertError) {
      console.warn("welcome_claims insert failed:", insertError.message);
    }

    return NextResponse.json({
      status: "sent",
      txHash: hash,
      amount: "0.5",
    });
  } catch (err) {
    console.error("welcome-usdm transfer failed:", err);
    const message =
      err instanceof Error ? err.message : "Transfer failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
