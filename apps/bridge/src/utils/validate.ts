import { z } from "zod";
import { ACTIONS } from "@claw-inbox/shared";

export const capturePayloadSchema = z.object({
  type: z.enum(["page", "selection"]),
  title: z.string().min(1),
  url: z.string().url(),
  selection: z.string().optional(),
  note: z.string().optional(),
  action: z.enum(ACTIONS),
  source: z
    .object({
      browser: z.string().optional(),
      capturedAt: z.string().optional(),
    })
    .optional(),
});
