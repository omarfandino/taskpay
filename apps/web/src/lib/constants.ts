export const CHAIN_IDS = {
  celo: 42220,
  celoSepolia: 11142220,
} as const;

export const DEFAULT_CHAIN_ID = CHAIN_IDS.celoSepolia;

export const TOKEN_ADDRESSES = {
  [CHAIN_IDS.celo]: {
    copm: "0x8a567e2ae79ca692bd748ab832081c45de4041ea" as const,
    usdm: "0x765de816845861e75a25fca122bb6898b8b1282a" as const,
    usdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const,
  },
  [CHAIN_IDS.celoSepolia]: {
    copm: "0x5F8d55c3627d2dc0a2B4afa798f877242F382F67" as const,
    usdm: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b" as const,
    usdc: "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as const,
  },
} as const;

export const TASKPAY_ADDRESSES: Record<number, `0x${string}` | undefined> = {
  [CHAIN_IDS.celoSepolia]:
    (process.env.NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA as `0x${string}`) ||
    undefined,
  [CHAIN_IDS.celo]:
    (process.env.NEXT_PUBLIC_TASKPAY_ADDRESS_MAINNET as `0x${string}`) ||
    undefined,
};

export const MIN_REWARD_COPM = 50;
export const MINIPAY_DEPOSIT_URL = "https://minipay.opera.com/add_cash";
/** @deprecated use MINIPAY_DEPOSIT_URL */
export const MINIPAY_ADD_CASH_URL = MINIPAY_DEPOSIT_URL;

export function getExplorerUrl(chainId: number, hash: string): string {
  const base =
    chainId === CHAIN_IDS.celoSepolia
      ? "https://sepolia.celoscan.io"
      : "https://celoscan.io";
  return `${base}/tx/${hash}`;
}

export function getMapUrl(location: string): string {
  return `https://maps.google.com?q=${encodeURIComponent(location)}`;
}

export function getMapEmbedUrl(location: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;
}

export enum TaskStatus {
  Open = 0,
  Taken = 1,
  PendingReview = 2,
  Completed = 3,
  Cancelled = 4,
}

export type Task = {
  id: bigint;
  poster: `0x${string}`;
  taker: `0x${string}`;
  description: string;
  location: string;
  reward: bigint;
  deadline: bigint;
  status: TaskStatus;
  evidenceUrl: string;
};

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.Open:
      return "Open";
    case TaskStatus.Taken:
      return "Taken";
    case TaskStatus.PendingReview:
      return "Pending review";
    case TaskStatus.Completed:
      return "Completed";
    case TaskStatus.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
}

export function formatCopm(amount: bigint): string {
  const value = Number(amount) / 1e18;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function parseCopm(amount: string): bigint {
  const parsed = parseFloat(amount);
  if (Number.isNaN(parsed)) return 0n;
  return BigInt(Math.floor(parsed * 1e18));
}
