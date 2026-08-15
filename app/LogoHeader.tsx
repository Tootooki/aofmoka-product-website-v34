/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";

export function LogoHeader({ homeHref = "/" }: { homeHref?: string }) {
  const [scrolled, setScrolled] = useState(false);

  const scrollPageToAbsoluteTop = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (homeHref !== "#top") return;
    event.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    if (window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  };

  useEffect(() => {
    const updateHeaderFade = () => setScrolled(window.scrollY !== 0);
    updateHeaderFade();
    window.addEventListener("scroll", updateHeaderFade, { passive: true });
    return () => window.removeEventListener("scroll", updateHeaderFade);
  }, []);

  return (
    <header className={`site-header${scrolled ? " site-header-scrolled" : ""}`}>
      <a className="header-bar" href={homeHref} aria-label="AOFMOKA home" onClick={scrollPageToAbsoluteTop}>
        <span className="header-logo">
          <img src="/brand/aofmoka-color-symbols-no-text.png" alt="AOFMOKA" />
        </span>
      </a>
    </header>
  );
}
