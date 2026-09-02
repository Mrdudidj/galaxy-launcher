import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useModeration() {
  return useQuery({
    queryKey: ["moderation"],
    queryFn: () => window.galaxy.moderation.getState()
  });
}

export function useInvalidateModeration(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["moderation"] });
}
