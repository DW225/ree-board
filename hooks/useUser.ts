import type { User } from "@/db/schema";
import { fetcher } from "@/lib/utils";
import useSWR from "swr";

export function useUser(id: User["id"]) {
  const { data, error, isLoading } = useSWR<User>(`/api/user/${id}`, fetcher);

  return {
    user: data,
    isError: error,
    isLoading,
  };
}
