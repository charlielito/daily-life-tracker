"use client";

import Link from "next/link";
import { useLocale } from "@/utils/useLocale";
import { type ComponentProps } from "react";

type LocalizedLinkProps = ComponentProps<typeof Link>;

export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const { getLocalizedPath } = useLocale();
  
  // Handle string hrefs
  if (typeof href === 'string') {
    // Check if href has query parameters
    const [path, query] = href.split('?');
    const localizedPath = getLocalizedPath(path);
    const finalHref = query ? `${localizedPath}?${query}` : localizedPath;
    return <Link href={finalHref} {...props} />;
  }
  
  // Handle object hrefs (with query params, etc.)
  if (typeof href === 'object' && href.pathname) {
    return <Link href={{ ...href, pathname: getLocalizedPath(href.pathname) }} {...props} />;
  }
  
  return <Link href={href} {...props} />;
}

