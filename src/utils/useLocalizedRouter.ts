"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "./useLocale";

export function useLocalizedRouter() {
  const router = useRouter();
  const { getLocalizedPath } = useLocale();

  return {
    ...router,
    push: (href: string) => {
      // Check if href has query parameters
      const [path, query] = href.split('?');
      const localizedPath = getLocalizedPath(path);
      const finalHref = query ? `${localizedPath}?${query}` : localizedPath;
      return router.push(finalHref);
    },
    replace: (href: string) => {
      // Check if href has query parameters
      const [path, query] = href.split('?');
      const localizedPath = getLocalizedPath(path);
      const finalHref = query ? `${localizedPath}?${query}` : localizedPath;
      return router.replace(finalHref);
    },
  };
}

