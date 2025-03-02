import type { User } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import useSWR from "swr";

export function useUser(id: User["id"]) {
  const shouldFetch = id !== undefined && id !== null;
  const { data, error, isLoading } = useSWR<{ user: User }>(
    shouldFetch ? `/api/user/${id}` : null,
    fetcher
  );

  return {
    user: data?.user,
    isError: error,
    isLoading,
  };
}
