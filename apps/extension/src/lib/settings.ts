export interface Settings {
  bridgeBaseUrl: string;
  apiToken: string;
}

const DEFAULTS: Settings = {
  bridgeBaseUrl: "http://127.0.0.1:8787",
  apiToken: "",
};

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(["bridgeBaseUrl", "apiToken"]);
  return {
    bridgeBaseUrl: result.bridgeBaseUrl || DEFAULTS.bridgeBaseUrl,
    apiToken: result.apiToken || DEFAULTS.apiToken,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set(settings);
}
