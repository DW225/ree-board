import type { ZodType } from "zod";

export type ZodObjectShape<T extends object> = {
  [K in keyof T]: ZodType<T[K]>
}
