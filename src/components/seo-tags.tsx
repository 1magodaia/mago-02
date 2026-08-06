import { Head } from "@tanstack/react-router";
import { type ReactNode } from "react";

/**
 * Common SEO properties for all pages.
 */
export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "software";
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  keywords?: string[];
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const DEFAULT_TITLE = "Busca Mágica — Encontre comércios locais com presença digital fraca";
const DEFAULT_DESC = "Descubra comércios próximos com pouca visibilidade online. Auditoria automática de site, Google Places, score de oportunidade e exportação CSV para prospecção.";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/2SkscptTwBXNWzX4oatZDLgpWMT2/social-images/social-1784866552161-full-fixed.webp";
const SITE_NAME = "Busca Mágica";
const TWITTER_HANDLE = "@buscamagica"; // Opcional
const DOMAIN = "https://buscamagica.lovable.app";

/**
 * SEOTags component to be used in TanStack Router's head() or components.
 * Note: TanStack Router v1 uses head() method for SSR-safe metadata.
 * This component acts as a helper for shared logic.
 */
export function getSEOMetadata(props: SEOProps) {
  const {
    title = DEFAULT_TITLE,
    description = DEFAULT_DESC,
    canonical,
    ogTitle,
    ogDescription,
    ogImage = DEFAULT_IMAGE,
    ogType = "website",
    twitterCard = "summary_large_image",
    noIndex = false,
    author,
    publishedTime,
    modifiedTime,
    section,
    keywords,
  } = props;

  const finalTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  
  const meta = [
    { title: finalTitle },
    { name: "description", content: description },
    { property: "og:title", content: ogTitle || finalTitle },
    { property: "og:description", content: ogDescription || description },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: twitterCard },
    { name: "twitter:title", content: ogTitle || finalTitle },
    { name: "twitter:description", content: ogDescription || description },
    { name: "twitter:image", content: ogImage },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "author", content: author || SITE_NAME },
    { name: "application-name", content: SITE_NAME },
    { name: "generator", content: "TanStack Start" },
  ];

  if (noIndex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  } else {
    meta.push({ name: "robots", content: "index, follow" });
  }

  if (keywords && keywords.length > 0) {
    meta.push({ name: "keywords", content: keywords.join(", ") });
  }

  const links: any[] = [];
  if (canonical) {
    links.push({ rel: "canonical", href: canonical.startsWith("http") ? canonical : `${DOMAIN}${canonical}` });
  }

  if (publishedTime) {
    meta.push({ property: "article:published_time", content: publishedTime });
  }
  if (modifiedTime) {
    meta.push({ property: "article:modified_time", content: modifiedTime });
  }
  if (section) {
    meta.push({ property: "article:section", content: section });
  }

  return { meta, links };
}

/**
 * JsonLd component for structured data.
 */
export function JsonLd({ data }: { data: Record<string, any> | Record<string, any>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
