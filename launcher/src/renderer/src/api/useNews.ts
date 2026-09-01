import { useQuery } from "@tanstack/react-query";

export function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: () => window.galaxy.backend.getNews(),
    staleTime: 5 * 60 * 1000
  });
}
