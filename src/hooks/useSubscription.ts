import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySubscription } from "@/lib/stripe.functions";

/** Snapshot of the current user's plan. Cached for 60s. */
export function useSubscription() {
  const fetchSub = useServerFn(getMySubscription);
  return useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => fetchSub(),
    staleTime: 60_000,
  });
}
