import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { withFluid } from "@fluid-tailwind/tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  const twMerge = extendTailwindMerge(withFluid);
  return twMerge(clsx(inputs));
}

export function getEnumKeys<
  T extends string,
  TEnumValue extends string | number
>(enumVariable: { [key in T]: TEnumValue }) {
  return Object.keys(enumVariable) as Array<T>;
}

export const fetcher = (args: [RequestInfo, RequestInit?] | RequestInfo) => {
  // Handle both array keys (from SWR) and simple string keys
  if (Array.isArray(args)) {
    return fetch(args[0], args[1]).then((res) => res.json());
  }
  return fetch(args).then((res) => res.json());
};
