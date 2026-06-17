import { TASKPAY_ADDRESSES } from "@/lib/constants";
import { useMiniPay } from "@/hooks/useMiniPay";

export function useTaskPayAddress(): `0x${string}` | undefined {
  const { chainId } = useMiniPay();
  const id = chainId ?? 11142220;
  return TASKPAY_ADDRESSES[id];
}
