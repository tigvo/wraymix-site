import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://wraymix.jp",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://wraymix.jp/booking",
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
