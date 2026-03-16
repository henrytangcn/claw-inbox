import { useState, useEffect } from "react";
import {
  ACTION_LABELS,
  ACTION_FEEDBACK,
  SELECTION_FEEDBACK,
  type ClawInboxAction,
  type CaptureType,
} from "@claw-inbox/shared";
import { getCurrentPageInfo, type PageInfo } from "../lib/browser";
import { sendCapture, getErrorMessage } from "../lib/api";
import { getSettings } from "../lib/settings";
import "./popup.css";

type Status = { type: "success" | "error"; message: string } | null;

export default function App() {
  const [pageInfo, setPageInfo] = useState<PageInfo>({ title: "", url: "" });
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [configured, setConfigured] = useState(true);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    getCurrentPageInfo().then(setPageInfo);
    getSettings().then((s) => {
      if (!s.apiToken) setConfigured(false);
    });
  }, []);

  const hasSelection = !!pageInfo.selection;

  const doSend = async (action: ClawInboxAction, type: CaptureType) => {
    setSending(true);
    setStatus(null);
    try {
      await sendCapture({
        type,
        title: pageInfo.title,
        url: pageInfo.url,
        action,
        selection: type === "selection" ? pageInfo.selection : undefined,
        note: note || undefined,
        source: {
          browser: "chrome",
          capturedAt: new Date().toISOString(),
        },
      });

      // Build feedback message
      let feedback: string;
      if (type === "selection" && SELECTION_FEEDBACK[action]) {
        feedback = SELECTION_FEEDBACK[action];
      } else {
        feedback = ACTION_FEEDBACK[action];
      }
      setStatus({ type: "success", message: feedback });
    } catch (err) {
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  };

  if (!configured) {
    return (
      <div className="container no-config">
        <p>请先配置 Bridge 地址和 API Token</p>
        <a onClick={() => chrome.runtime.openOptionsPage()}>打开设置</a>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Claw Inbox</h1>

      {/* Page info */}
      <div className="page-info">
        <div className="title">{pageInfo.title || "Loading..."}</div>
        <div className="url">{pageInfo.url}</div>
      </div>

      {/* Selection indicator */}
      {hasSelection && (
        <div className="selection-badge">
          <span className="selection-icon">T</span>
          <span>已选中文本</span>
          <span className="selection-preview">
            {pageInfo.selection!.length > 60
              ? pageInfo.selection!.slice(0, 60) + "..."
              : pageInfo.selection}
          </span>
        </div>
      )}

      {/* Primary actions for page */}
      <div className="section-label">
        {hasSelection ? "页面操作" : "快捷操作"}
      </div>
      <div className="action-grid">
        <button
          className="action-btn primary"
          onClick={() => doSend("summarize", "page")}
          disabled={sending}
        >
          总结这页
        </button>
        <button
          className="action-btn primary"
          onClick={() => doSend("extract", "page")}
          disabled={sending}
        >
          提取正文
        </button>
        <button
          className="action-btn primary"
          onClick={() => doSend("later", "page")}
          disabled={sending}
        >
          稍后处理
        </button>
      </div>

      {/* Selection actions */}
      {hasSelection && (
        <>
          <div className="section-label">选中文本操作</div>
          <div className="action-grid">
            <button
              className="action-btn selection-btn"
              onClick={() => doSend("summarize", "selection")}
              disabled={sending}
            >
              总结选中文本
            </button>
            <button
              className="action-btn selection-btn"
              onClick={() => doSend("translate", "selection")}
              disabled={sending}
            >
              翻译选中文本
            </button>
          </div>
        </>
      )}

      {/* More actions toggle */}
      <button
        className="more-toggle"
        onClick={() => setShowMore(!showMore)}
      >
        {showMore ? "收起" : "更多操作"}
      </button>

      {showMore && (
        <div className="action-grid">
          <button
            className="action-btn secondary"
            onClick={() => doSend("translate", "page")}
            disabled={sending}
          >
            {ACTION_LABELS.translate}
          </button>
          <button
            className="action-btn secondary"
            onClick={() => doSend("archive", "page")}
            disabled={sending}
          >
            {ACTION_LABELS.archive}
          </button>
        </div>
      )}

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="给龙虾的备注... 例如：帮我提炼重点 / 翻成中文 / 收进个人库"
      />

      {/* Sending overlay */}
      {sending && <div className="sending-overlay">发送中...</div>}

      {/* Status feedback */}
      {status && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}

      {/* Settings link */}
      <div className="footer">
        <a onClick={() => chrome.runtime.openOptionsPage()}>设置</a>
      </div>
    </div>
  );
}
