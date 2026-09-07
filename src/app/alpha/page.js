"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The skyline used to live here and is now the front page, so this forwards.
 * The rest of this folder is still the page itself — only `page.js` moved.
 *
 * A client-side replace because the site is a static export, where Next's
 * redirects() and the server-side redirect() are both unavailable.
 */
export default function Alpha() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <noscript>
      <div className="page">
        <div className="prose">
          <p>
            <Link href="/">Continue →</Link>
          </p>
        </div>
      </div>
    </noscript>
  );
}
