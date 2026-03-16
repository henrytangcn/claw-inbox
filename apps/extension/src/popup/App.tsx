import { useState, useEffect } from "react";
import {
  ACTION_LABELS,
  type ClawInboxAction,
  type CaptureType,
  type CapturePayload,
  type CaptureHistoryItem,
  type CaptureResponse,
} from "@claw-inbox/shared";
import { getCurrentPageInfo, type PageInfo } from "../lib/browser";
import { sendCapture, getErrorMessage, isRetryableError } from "../lib/api";
import { getSettings } from "../lib/settings";
import { getHistory, addHistoryItem, updateHistoryItem } from "../lib/history";
import "./popup.css";

type Status = { type: "success" | "error"; message: string; hint?: string } | null;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export default function App() {
  const [pageInfo, setPageInfo] = useState<PageInfo>({ title: "", url: "" });
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [configured, setConfigured] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [history, setHistory] = useState<CaptureHistoryItem[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentPageInfo().then(setPageInfo);
    getSettings().then((s) => {
      if (!s.apiToken) setConfigured(false);
    });
    getHistory().then(setHistory);
  }, []);

  const hasSelection = !!pageInfo.selection;

  const buildPayload = (action: ClawInboxAction, type: CaptureType): CapturePayload => ({
    type,
    title: pageInfo.title,
    url: pageInfo.url,
    action,
    selection: type === "selection" ? pageInfo.selection : undefined,
    note: note || undefined,
    source: {
      browser: "chrome",
      capturedAt: new Date().toISOString(),
      via: "extension-popup",
    },
  });

  const doSend = async (action: ClawInboxAction, type: CaptureType) => {
    setSending(true);
    setStatus(null);

    const payload = buildPayload(action, type);
    let response: CaptureResponse | null = null;
    let errorMsg: string | null = null;

    try {
      response = await sendCapture(payload);
      setStatus({
        type: "success",
        message: response.message,
        hint: response.deliveryHint,
      });
    } catch (err) {
      errorMsg = getErrorMessage(err);
      setStatus({ type: "error", message: errorMsg });
    }

    await addHistoryItem(payload, response, errorMsg);
    setHistory(await getHistory());
    setSending(false);
  };

  const doRetry = async (item: CaptureHistoryItem) => {
    setRetryingId(item.id);
    let response: CaptureResponse | null = null;
    let errorMsg: string | null = null;

    try {
      response = await sendCapture(item.payload);
      const isPending = response.mode === "pending";
      await updateHistoryItem(item.id, {
        status: isPending ? "pending" : "success",
        targetLabel: response.targetLabel ?? item.targetLabel,
        retryable: false,
        errorMessage: undefined,
      });
      setStatus({
        type: "success",
        message: response.message,
        hint: response.deliveryHint,
      });
    } catch (err) {
      errorMsg = getErrorMessage(err);
      await updateHistoryItem(item.id, {
        errorMessage: errorMsg,
      });
      setStatus({ type: "error", message: `重试失败: ${errorMsg}` });
    }

    setHistory(await getHistory());
    setRetryingId(null);
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
          加入待处理
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
        <div className={`status ${status.type}`}>
          <div>{status.message}</div>
          {status.hint && <div className="status-hint">{status.hint}</div>}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <div className="section-label history-label">最近发送</div>
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className={`history-item history-${item.status}`}>
                <div className="history-top">
                  <span className={`history-badge badge-${item.status}`}>
                    {item.status === "success" ? "✓" : item.status === "pending" ? "◷" : "✗"}
                  </span>
                  <span className="history-action">{ACTION_LABELS[item.action]}</span>
                  <span className="history-type">{item.type === "selection" ? "选中" : "页面"}</span>
                  <span className="history-time">{timeAgo(item.createdAt)}</span>
                </div>
                <div className="history-title">{item.title}</div>
                <div className="history-target">{item.targetLabel}</div>
                {item.status === "failed" && (
                  <div className="history-error">
                    <span>{item.errorMessage}</span>
                    {item.retryable && (
                      <button
                        className="retry-btn"
                        onClick={() => doRetry(item)}
                        disabled={retryingId === item.id}
                      >
                        {retryingId === item.id ? "重试中..." : "重试"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Settings link */}
      <div className="footer">
        <a onClick={() => chrome.runtime.openOptionsPage()}>设置</a>
      </div>
    </div>
  );
}
