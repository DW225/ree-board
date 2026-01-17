import type { User, UserPublicInfo } from "@/lib/types/user";
import { fetcher } from "@/lib/utils";
import useSWR from "swr";

export function useUser(id: User["id"]) {
  const shouldFetch = id !== undefined && id !== null && id.length > 0;
  const { data, error, isLoading } = useSWR<{ user: UserPublicInfo }>(
    shouldFetch ? `/api/user/${id}` : null,
    fetcher
  );

  return {
    user: data?.user,
    isError: error,
    isLoading,
  };
}
