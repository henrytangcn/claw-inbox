import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { CapturePayload } from "@claw-inbox/shared";
import { config } from "../config.js";

const PENDING_DIR = join(config.inboxBasePath, "pending");
const PROCESSED_DIR = join(config.inboxBasePath, "processed");
const FAILED_DIR = join(config.inboxBasePath, "failed");

export interface InboxItem {
  id: string;
  status: "pending" | "processing" | "done" | "failed";
  createdAt: string;
  updatedAt: string;
  type: string;
  action: string;
  title: string;
  url: string;
  selection: string | null;
  note: string | null;
  source: {
    browser?: string;
    capturedAt?: string;
    via?: string;
  };
  routing: {
    deliverChannel: string;
    deliverTarget: string;
  };
  nextActions: string[];
  result: unknown;
  error: unknown;
}

/** Ensure all queue directories exist */
async function ensureDirs(): Promise<void> {
  await mkdir(PENDING_DIR, { recursive: true });
  await mkdir(PROCESSED_DIR, { recursive: true });
  await mkdir(FAILED_DIR, { recursive: true });
}

function generateId(): string {
  return "ci_" + randomBytes(6).toString("hex");
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function createPendingItem(payload: CapturePayload): Promise<InboxItem> {
  await ensureDirs();

  const now = new Date();
  const id = generateId();

  const item: InboxItem = {
    id,
    status: "pending",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    type: payload.type,
    action: payload.action,
    title: payload.title,
    url: payload.url,
    selection: payload.selection ?? null,
    note: payload.note ?? null,
    source: {
      browser: payload.source?.browser,
      capturedAt: payload.source?.capturedAt,
      via: payload.source?.via ?? "extension-popup",
    },
    routing: {
      deliverChannel: config.openclawDeliverChannel || "telegram",
      deliverTarget: config.openclawDeliverTarget || "",
    },
    nextActions: ["summarize", "translate", "extract", "archive"],
    result: null,
    error: null,
  };

  const filename = `${safeTimestamp(now)}__${id}.json`;
  const filepath = join(PENDING_DIR, filename);

  await writeFile(filepath, JSON.stringify(item, null, 2), "utf-8");
  console.log(`[Inbox] Created pending item: ${filepath}`);

  return item;
}
