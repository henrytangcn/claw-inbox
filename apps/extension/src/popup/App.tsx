import { useState, useEffect } from "react";
import { ACTIONS, type ClawInboxAction } from "@claw-inbox/shared";
import { getCurrentPageInfo, type PageInfo } from "../lib/browser";
import { sendCapture } from "../lib/api";
import { getSettings } from "../lib/settings";
import "./popup.css";

type Status = { type: "success" | "error"; message: string } | null;

export default function App() {
  const [pageInfo, setPageInfo] = useState<PageInfo>({ title: "", url: "" });
  const [action, setAction] = useState<ClawInboxAction>("later");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    getCurrentPageInfo().then(setPageInfo);
    getSettings().then((s) => {
      if (!s.apiToken) setConfigured(false);
    });
  }, []);

  const handleSend = async () => {
    setSending(true);
    setStatus(null);
    try {
      await sendCapture({
        type: "page",
        title: pageInfo.title,
        url: pageInfo.url,
        action,
        note: note || undefined,
        source: {
          browser: "chrome",
          capturedAt: new Date().toISOString(),
        },
      });
      setStatus({ type: "success", message: "Sent!" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Send failed",
      });
    } finally {
      setSending(false);
    }
  };

  if (!configured) {
    return (
      <div className="container no-config">
        <p>Please configure bridge URL and token first.</p>
        <a onClick={() => chrome.runtime.openOptionsPage()}>Open Settings</a>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Claw Inbox</h1>

      <div className="page-info">
        <div className="title">{pageInfo.title || "Loading..."}</div>
        <div className="url">{pageInfo.url}</div>
      </div>

      <label htmlFor="action">Action</label>
      <select
        id="action"
        value={action}
        onChange={(e) => setAction(e.target.value as ClawInboxAction)}
      >
        {ACTIONS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <label htmlFor="note">Note</label>
      <textarea
        id="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note..."
      />

      <button onClick={handleSend} disabled={sending}>
        {sending ? "Sending..." : "Send to Claw"}
      </button>

      {status && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}
    </div>
  );
}
