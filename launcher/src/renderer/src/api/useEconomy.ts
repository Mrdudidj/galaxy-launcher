import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useEconomy() {
  return useQuery({
    queryKey: ["economy"],
    queryFn: () => window.galaxy.economy.get()
  });
}

export function useShopCatalog() {
  return useQuery({
    queryKey: ["shopCatalog"],
    queryFn: () => window.galaxy.shop.getCatalog(),
    staleTime: Infinity
  });
}

export function useInvalidateEconomy(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["economy"] });
}
