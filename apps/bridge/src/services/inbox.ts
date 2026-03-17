import { mkdir, writeFile, readFile, readdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { CapturePayload, InboxItem, PendingProcessAction } from "@claw-inbox/shared";
import { config } from "../config.js";

const PENDING_DIR = join(config.inboxBasePath, "pending");
const PROCESSED_DIR = join(config.inboxBasePath, "processed");
const FAILED_DIR = join(config.inboxBasePath, "failed");

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

// ── Create ──

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

// ── List ──

export async function listPendingItems(limit = 20): Promise<InboxItem[]> {
  await ensureDirs();

  let files: string[];
  try {
    files = await readdir(PENDING_DIR);
  } catch {
    return [];
  }

  // Only JSON files, sorted descending by name (timestamp-based)
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse().slice(0, limit);

  const items: InboxItem[] = [];
  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(PENDING_DIR, file), "utf-8");
      const item = JSON.parse(content) as InboxItem;
      items.push(item);
    } catch (err) {
      console.warn(`[Inbox] Failed to read ${file}:`, err);
    }
  }

  return items;
}

// ── Get by ID ──

async function findFileById(dir: string, id: string): Promise<string | null> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }
  return files.find((f) => f.includes(id) && f.endsWith(".json")) ?? null;
}

export async function getPendingItem(id: string): Promise<{ item: InboxItem; filepath: string } | null> {
  await ensureDirs();

  const filename = await findFileById(PENDING_DIR, id);
  if (!filename) return null;

  const filepath = join(PENDING_DIR, filename);
  const content = await readFile(filepath, "utf-8");
  return { item: JSON.parse(content) as InboxItem, filepath };
}

// ── Update status ──

async function updateItemFile(filepath: string, updates: Partial<InboxItem>): Promise<InboxItem> {
  const content = await readFile(filepath, "utf-8");
  const item = JSON.parse(content) as InboxItem;
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  await writeFile(filepath, JSON.stringify(item, null, 2), "utf-8");
  return item;
}

export async function markProcessing(id: string): Promise<InboxItem> {
  const found = await getPendingItem(id);
  if (!found) throw new Error("PENDING_NOT_FOUND");
  if (found.item.status !== "pending") throw new Error("INVALID_PENDING_STATE");
  return updateItemFile(found.filepath, { status: "processing" });
}

export async function markDone(id: string, processedAction: PendingProcessAction): Promise<InboxItem> {
  const found = await getPendingItem(id);
  if (!found) throw new Error("PENDING_NOT_FOUND");

  const item = await updateItemFile(found.filepath, {
    status: "done",
    result: { processedAction, processedAt: new Date().toISOString() },
  });

  // Move to processed/
  const filename = found.filepath.split("/").pop()!;
  const destPath = join(PROCESSED_DIR, filename);
  try {
    await rename(found.filepath, destPath);
    console.log(`[Inbox] Moved to processed: ${destPath}`);
  } catch (err) {
    console.warn(`[Inbox] Move to processed failed, keeping in pending:`, err);
  }

  return item;
}

export async function markFailed(id: string, error: string): Promise<InboxItem> {
  const found = await getPendingItem(id);
  if (!found) throw new Error("PENDING_NOT_FOUND");

  const item = await updateItemFile(found.filepath, {
    status: "failed",
    error,
  });

  // Move to failed/
  const filename = found.filepath.split("/").pop()!;
  const destPath = join(FAILED_DIR, filename);
  try {
    await rename(found.filepath, destPath);
    console.log(`[Inbox] Moved to failed: ${destPath}`);
  } catch (err) {
    console.warn(`[Inbox] Move to failed failed, keeping in pending:`, err);
  }

  return item;
}
