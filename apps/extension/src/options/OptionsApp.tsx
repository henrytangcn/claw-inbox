import { useState, useEffect } from "react";
import { getSettings, saveSettings } from "../lib/settings";
import { checkHealth, getErrorMessage } from "../lib/api";

type TestStatus = { type: "success" | "error"; message: string } | null;

export default function OptionsApp() {
  const [bridgeBaseUrl, setBridgeBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>(null);
  const [testing, setTesting] = useState(false);
  const [lastTestTime, setLastTestTime] = useState<string>("");

  useEffect(() => {
    getSettings().then((s) => {
      setBridgeBaseUrl(s.bridgeBaseUrl);
      setApiToken(s.apiToken);
    });
  }, []);

  const handleSave = async () => {
    await saveSettings({ bridgeBaseUrl, apiToken });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    // Auto-save before testing
    await saveSettings({ bridgeBaseUrl, apiToken });

    setTesting(true);
    setTestStatus(null);
    try {
      const res = await checkHealth();
      if (res.ok) {
        setTestStatus({ type: "success", message: "Bridge 连接正常" });
      } else {
        setTestStatus({ type: "error", message: "Bridge 返回异常响应" });
      }
    } catch (err) {
      setTestStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setTesting(false);
      setLastTestTime(new Date().toLocaleTimeString());
    }
  };

  const configComplete = !!bridgeBaseUrl && !!apiToken;

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Claw Inbox 设置</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
        配置 Bridge 连接信息，插件将通过 Bridge 将内容发送给龙虾处理。
      </p>

      {/* Connection status indicator */}
      <div style={{
        padding: "10px 12px",
        borderRadius: 6,
        marginBottom: 20,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: testStatus?.type === "success" ? "#d4edda" :
                     testStatus?.type === "error" ? "#f8d7da" :
                     configComplete ? "#e8f4fd" : "#fff3cd",
        color: testStatus?.type === "success" ? "#155724" :
               testStatus?.type === "error" ? "#721c24" :
               configComplete ? "#0c5460" : "#856404",
        border: `1px solid ${
          testStatus?.type === "success" ? "#c3e6cb" :
          testStatus?.type === "error" ? "#f5c6cb" :
          configComplete ? "#bee5eb" : "#ffeeba"
        }`,
      }}>
        <span style={{ fontSize: 16 }}>
          {testStatus?.type === "success" ? "\u2705" :
           testStatus?.type === "error" ? "\u274c" :
           configComplete ? "\u2699\ufe0f" : "\u26a0\ufe0f"}
        </span>
        <div>
          <div style={{ fontWeight: 500 }}>
            {testStatus?.type === "success" ? "连接正常" :
             testStatus?.type === "error" ? "连接异常" :
             configComplete ? "已配置，未测试" : "请填写配置信息"}
          </div>
          {lastTestTime && (
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>
              上次测试: {lastTestTime}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 500, marginBottom: 4, fontSize: 13 }}>
          Bridge URL
        </label>
        <input
          type="text"
          value={bridgeBaseUrl}
          onChange={(e) => setBridgeBaseUrl(e.target.value)}
          placeholder="http://your-server:8787"
          style={{ width: "100%", padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          你的 Bridge 服务地址，例如 https://bridge.example.com
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 500, marginBottom: 4, fontSize: 13 }}>
          API Token
        </label>
        <input
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder="Bridge API Token"
          style={{ width: "100%", padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          与服务器 .env 中 CLAW_INBOX_API_TOKEN 保持一致
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1, padding: 10, background: "#e74c3c", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          {saved ? "已保存!" : "保存"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          style={{
            flex: 1, padding: 10, background: "#3498db", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
            opacity: testing ? 0.7 : 1,
          }}
        >
          {testing ? "测试中..." : "测试连接"}
        </button>
      </div>

      {testStatus && (
        <div
          style={{
            padding: 10, borderRadius: 6, fontSize: 13, textAlign: "center",
            background: testStatus.type === "success" ? "#d4edda" : "#f8d7da",
            color: testStatus.type === "success" ? "#155724" : "#721c24",
          }}
        >
          {testStatus.message}
        </div>
      )}

      {/* How it works */}
      <div style={{
        marginTop: 24,
        padding: 12,
        background: "#f8f9fa",
        borderRadius: 6,
        fontSize: 12,
        color: "#666",
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>工作方式</div>
        <div>插件捕获网页信息 → 发送到 Bridge → Bridge 转发给龙虾 (OpenClaw) → 处理结果发送到 Telegram/飞书，并保存到 Notion</div>
        <div style={{ marginTop: 8, borderTop: "1px solid #e8e8e8", paddingTop: 8 }}>
          <div><b>总结 / 提取 / 翻译 / 归档</b>：龙虾处理后，结果默认回到 Telegram</div>
          <div><b>加入待处理</b>：写入 Bridge 服务器的待处理队列，不会立即处理，可后续继续操作</div>
        </div>
      </div>
    </div>
  );
}
