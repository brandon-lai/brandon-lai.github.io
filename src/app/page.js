"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * `/` forwards to `/alpha` for now. The bento grid still exists untouched in
 * components/HomeGrid.js — to put it back, drop the redirect and return
 * <HomeGrid /> instead.
 *
 * This is a client-side replace because the site is a static export, where
 * Next's redirects() and the server-side redirect() are both unavailable.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/alpha");
  }, [router]);

  return (
    <noscript>
      <div className="page">
        <div className="prose">
          <p>
            <Link href="/alpha">Continue to Alpha →</Link>
          </p>
        </div>
      </div>
    </noscript>
  );
}
