import { z } from "zod";

export const localMessageSchema = z
  .object({
    name: z
      .string()
      .regex(/^(POST|ACTION|MEMBER)_[A-Z_]+$/)
      .max(80),
    data: z.string().max(64 * 1024),
    extras: z
      .object({
        headers: z
          .object({ user: z.string().min(1).max(128).nullable() })
          .strict(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type LocalMessage = z.infer<typeof localMessageSchema>;
