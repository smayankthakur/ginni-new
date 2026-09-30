"use client";

import { useEffect, useRef, useState } from "react";

// Ginni Ki Baatein lives on its own subdomain and doesn't have /about,
// /kundli-milan, or /privacy routes of its own — those pages live on the
// main site, so those nav items resolve back to thedivinetarotonline.com,
// exactly like the real header does (its own "Home" link points at the
// same absolute URL). Reading, Course, and Personal Reading are each their
// own subdomain.
const MAIN_SITE = "https://thedivinetarotonline.com";
const READING_SITE = "https://reading.thedivinetarotonline.com/";

const NAV_LINKS = [
  { href: `${MAIN_SITE}/`, label: "Home" },
  { href: `${MAIN_SITE}/about`, label: "About" },
  { href: READING_SITE, label: "Reading", isExternal: true },
  { href: "https://learn.thedivinetarotonline.com/", label: "Course", isExternal: true },
  { href: `${MAIN_SITE}/kundli-milan`, label: "Kundli Milan" },
  // { href: "https://booking.thedivinetarotonline.com/", label: "Personal Reading", isExternal: true },
];

const CTA_HREF = READING_SITE;

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile panel if the viewport grows past the mobile breakpoint.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 960) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Mobile only: below 820px, the reading app's own mobile-topbar and
  // question-trigger stack directly under this header (see .site-page rules
  // in globals.css, which all key off --site-header-h). On a phone that's
  // three sticky bars before any actual content, so once the person starts
  // scrolling this header shrinks to a compact bar (scrolling down) and
  // returns to full size when they scroll back up.
  //
  // Deliberately shrinks to 48px, never to 0 — a 0-height element can't be
  // tapped at all, so if this ever got stuck "collapsed" (momentum
  // scrolling firing an odd sequence of deltas is common on mobile), the
  // logo and hamburger would disappear with no way to bring them back
  // except scrolling back up, which reads as "the header stopped
  // responding." Staying at 48px keeps both visible and tappable no matter
  // what state this logic ends up in. Desktop is untouched: this never
  // runs above 820px, and the panel menu (`open`) always forces the header
  // back to full size so its links stay reachable.
  const lastYRef = useRef(0);
  useEffect(() => {
    const root = document.documentElement;
    const setCompact = (compact) => {
      // Full height is 64px on phones (≤820px, matching the mobile default in
      // globals.css) and 80px on desktop; compact is 48px.
      const full = window.innerWidth <= 820 ? "64px" : "80px";
      root.style.setProperty("--site-header-h", compact ? "48px" : full);
    };
    const onScroll = () => {
      if (window.innerWidth > 820 || open) {
        setCompact(false);
        lastYRef.current = window.scrollY;
        return;
      }
      const y = window.scrollY;
      const delta = y - lastYRef.current;
      if (y < 40) {
        setCompact(false);
      } else if (delta > 6) {
        setCompact(true);
      } else if (delta < -6) {
        setCompact(false);
      }
      lastYRef.current = y;
    };
    onScroll(); // run once immediately — forces the header back to full
                // size right away when `open` flips true, without waiting
                // for a scroll
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.style.removeProperty("--site-header-h");
    };
  }, [open]);

  return (
    <header
      className={
        "site-header" +
        (scrolled ? " is-scrolled" : "") +
        // .site-mobile-panel renders as an absolutely-positioned child of
        // this header, starting at top:100% — i.e. entirely below the
        // header's own box. overflow:hidden (needed for the height-collapse
        // transition above) clips it into invisibility whenever it's open.
        // The header is always forced to full height while open anyway, so
        // there's no downside to lifting the clip at the same time.
        (open ? " menu-open" : "")
      }
    >
      <div className="site-header-inner">
        <a className="site-brand" href={MAIN_SITE} aria-label="The Divine Tarot — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="site-brand-logo" />
          <span className="site-brand-text">
            <span className="site-brand-name">The Divine Tarot</span>
            <span className="site-brand-tag">Premium Tarot Guidance</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.isExternal ? "_blank" : undefined}
              rel={link.isExternal ? "noopener noreferrer" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a className="site-cta" href={CTA_HREF}>
          Ask your question here
        </a>

        <button
          type="button"
          className={"site-menu-btn" + (open ? " open" : "")}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div className="site-mobile-panel">
          <nav aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.isExternal ? "_blank" : undefined}
                rel={link.isExternal ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <a className="site-cta site-cta-block" href={CTA_HREF} onClick={() => setOpen(false)}>
            Ask your question here
          </a>
        </div>
      )}
    </header>
  );
}
