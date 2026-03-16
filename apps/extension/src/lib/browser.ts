export interface PageInfo {
  title: string;
  url: string;
}

export async function getCurrentPageInfo(): Promise<PageInfo> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return {
    title: tab?.title ?? "",
    url: tab?.url ?? "",
  };
}
