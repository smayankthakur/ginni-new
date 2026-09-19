"use client";

import { useEffect, useState } from "react";

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

  return (
    <header className={"site-header" + (scrolled ? " is-scrolled" : "")}>
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
