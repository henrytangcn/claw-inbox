export interface PageInfo {
  title: string;
  url: string;
  selection?: string;
}

export async function getCurrentPageInfo(): Promise<PageInfo> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const info: PageInfo = {
    title: tab?.title ?? "",
    url: tab?.url ?? "",
  };

  // Try to get selected text from the active tab
  if (tab?.id) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() ?? "",
      });
      const text = results?.[0]?.result;
      if (text && text.trim()) {
        info.selection = text.trim();
      }
    } catch {
      // scripting may fail on chrome:// pages, etc. — ignore
    }
  }

  return info;
}
