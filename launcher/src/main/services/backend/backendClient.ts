import type { NewsItem } from "../../../shared/backend.js";

const BACKEND_URL = "http://localhost:4000";

export async function getNews(): Promise<NewsItem[]> {
  const response = await fetch(`${BACKEND_URL}/news`);
  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items: NewsItem[] };
  return data.items;
}
