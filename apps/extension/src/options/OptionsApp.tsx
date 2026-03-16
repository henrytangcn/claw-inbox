import { useState, useEffect } from "react";
import { getSettings, saveSettings } from "../lib/settings";
import { checkHealth } from "../lib/api";

type TestStatus = { type: "success" | "error"; message: string } | null;

export default function OptionsApp() {
  const [bridgeBaseUrl, setBridgeBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>(null);
  const [testing, setTesting] = useState(false);

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
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await checkHealth();
      if (res.ok) {
        setTestStatus({ type: "success", message: "Bridge is reachable!" });
      } else {
        setTestStatus({ type: "error", message: "Bridge returned unexpected response" });
      }
    } catch (err) {
      setTestStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>Claw Inbox Settings</h1>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
          Bridge URL
        </label>
        <input
          type="text"
          value={bridgeBaseUrl}
          onChange={(e) => setBridgeBaseUrl(e.target.value)}
          placeholder="http://127.0.0.1:8787"
          style={{ width: "100%", padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #ccc" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
          API Token
        </label>
        <input
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder="Your bridge API token"
          style={{ width: "100%", padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #ccc" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1, padding: 10, background: "#e74c3c", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          {saved ? "Saved!" : "Save"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          style={{
            flex: 1, padding: 10, background: "#3498db", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          {testing ? "Testing..." : "Test Connection"}
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
    </div>
  );
}
