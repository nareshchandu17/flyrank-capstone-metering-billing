import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HalftoneDots from './HalftoneDots';

const FOOTER_COLUMNS = [
  {
    title: 'PRODUCT',
    links: [
      { name: 'Usage Metering', href: '#define' },
      { name: 'Entitlements', href: '#limits' },
      { name: 'Pricing Models', href: '/dashboard' },
      { name: 'Billing & Invoicing', href: '/dashboard/history' },
      { name: 'Integrations', href: '/dashboard/settings' }
    ]
  },
  {
    title: 'DEVELOPERS',
    links: [
      { name: 'Quickstart', href: '/dashboard' },
      { name: 'API Reference', href: '/dashboard' },
      { name: 'SDKs', href: '/dashboard' },
      { name: 'Webhooks', href: '/dashboard/settings' },
      { name: 'Changelog', href: '/dashboard' }
    ]
  },
  {
    title: 'COMPANY',
    links: [
      { name: 'About', href: '/dashboard' },
      { name: 'Security', href: '/dashboard' },
      { name: 'Contact', href: '/dashboard' },
      { name: 'Blog', href: '/dashboard' },
      { name: 'Careers', href: '/dashboard' }
    ]
  }
];

function FooterLink({ title, href }) {
  const [hovered, setHovered] = useState(false);
  const isHash = href.startsWith('#');

  if (isHash) {
    return (
      <a
        href={href}
        className="footer-link"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className={`footer-link-dot ${hovered ? 'active' : ''}`} />
        <span className="footer-link-text">{title}</span>
      </a>
    );
  }

  return (
    <Link
      to={href}
      className="footer-link"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={`footer-link-dot ${hovered ? 'active' : ''}`} />
      <span className="footer-link-text">{title}</span>
    </Link>
  );
}

export default function InteractiveFooter() {
  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="flexprice-footer" id="footer">
      <div className="f-wrap">
        {/* Pitch & Link Columns */}
        <div className="f-top">
          <div className="f-pitch">
            <div className="f-eyebrow">
              <span className="f-dot">•</span> USAGE METERING &nbsp;
              <span className="f-dot">•</span> ENTITLEMENTS &nbsp;
              <span className="f-dot">•</span> BILLING INFRASTRUCTURE
            </div>
            <h2 className="f-headline">
              Turn product usage<br />
              into predictable revenue.
            </h2>
            <p className="f-lede">
              Capture, meter, and bill for every unit of usage with a developer-first infrastructure built for scale, accuracy, and flexibility.
            </p>
            <div className="f-actions">
              <Link className="f-btn-lime" to="/dashboard">
                Start Building Free <span className="f-arrow">→</span>
              </Link>
              <Link className="f-btn-docs" to="/dashboard">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                Read the Docs
              </Link>
            </div>
          </div>

          <div className="f-cols">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="f-col">
                <h4 className="f-col-title">{col.title}</h4>
                <ul className="f-links-list">
                  {col.links.map((link) => (
                    <li key={link.name}>
                      <FooterLink title={link.name} href={link.href} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider Line */}
        <div className="f-divider" />

        {/* Meta Row: Brand, Tagline, Socials, Copyright, Back to Top */}
        <div className="f-bottom">
          <div className="f-brand-group">
            <a href="#top" className="f-brand-link" aria-label="flexprice home">
              <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true">
                <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h17A1.5 1.5 0 0 1 23 4.5V10H3z" fill="currentColor" />
                <path d="M3 12.5h20L13 23z" fill="currentColor" />
              </svg>
              flexprice
            </a>
            <span className="f-pipe" aria-hidden="true">|</span>
            <span className="f-tagline">
              Usage metering and billing infrastructure for modern software products.
            </span>
          </div>

          <div className="f-right-group">
            <div className="f-socials">
              {/* GitHub */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="f-social-btn"
                aria-label="GitHub"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </a>
              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="f-social-btn"
                aria-label="LinkedIn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              {/* X */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="f-social-btn"
                aria-label="X"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>

            <span className="f-copyright">© 2026 Flexprice. All rights reserved.</span>

            <button type="button" onClick={scrollToTop} className="f-backtop">
              Back to top ↑
            </button>
          </div>
        </div>
      </div>

      {/* Halftone Sunrise Dot Field */}
      <div className="f-dots-wrap">
        <HalftoneDots
          spacing={14}
          sunSize={380}
          accent="#D4FF28"
          dotColor="#D5DAD3"
          dotOpacity={0.36}
          reach={60}
          swell={0.9}
          glow={1}
          ease={0.14}
          height={280}
        />
      </div>
    </footer>
  );
}
