import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InteractiveFooter from '../components/InteractiveFooter';
import './FlexpriceLanding.css';

const EVENTS = [
  { name: 'tokens/hour', title: 'Token usage', unit: 'k/hour', base: 35, amp: 0.16, ph: 0.4, key: 'llm.completion', agg: 'SUM', prop: 'tokens', per: 'hour' },
  { name: 'Storage', title: 'Storage', unit: 'GB', base: 412, amp: 0.04, ph: 1.1, key: 'storage.write', agg: 'MAX', prop: 'gigabytes', per: 'day' },
  { name: 'API Calls', title: 'API calls', unit: 'hits', base: 62, amp: 0.25, ph: 2.2, key: 'api.request', agg: 'COUNT', prop: 'none', per: 'minute' },
  { name: 'pageviews', title: 'Page views', unit: 'views/min', base: 134, amp: 0.2, ph: 3.0, key: 'page.view', agg: 'COUNT', prop: 'path', per: 'hour' },
  { name: 'FX transfers', title: 'FX transfers', unit: 'per min', base: 18, amp: 0.3, ph: 4.1, key: 'fx.transfer', agg: 'SUM', prop: 'amount_usd', per: 'day' },
  { name: 'views', title: 'Views', unit: 'views/min', base: 240, amp: 0.22, ph: 5.0, key: 'video.view', agg: 'COUNT', prop: 'asset_id', per: 'hour' },
  { name: 'users', title: 'Active users', unit: 'users', base: 1284, amp: 0.08, ph: 5.9, key: 'session.start', agg: 'UNIQUE', prop: 'user_id', per: 'month' }
];

const AGGS = [
  { k: 'COUNT', v: '1,284', u: 'events', d: 'Counts every llm.completion event for the customer in each hour.' },
  { k: 'SUM', v: '412,930', u: 'tokens', d: 'Adds the tokens property across llm.completion events in each hour.' },
  { k: 'MAX', v: '4,096', u: 'tokens', d: 'Keeps the largest tokens value seen in a single event each hour.' },
  { k: 'UNIQUE', v: '38', u: 'end users', d: 'Counts distinct end users who sent llm.completion in each hour.' }
];

const STREAM = [
  { n: 'llm.completion', q: (x) => 1 + (x % 4000), u: 'tokens' },
  { n: 'api.request', q: () => 1, u: 'call' },
  { n: 'storage.write', q: (x) => 1 + (x % 900), u: 'MB' },
  { n: 'fx.transfer', q: (x) => 50 + (x % 9000), u: 'USD' },
  { n: 'page.view', q: () => 1, u: 'view' }
];

const CUST = ['cus_4F2K9', 'cus_7A1QD', 'cus_B83XM', 'cus_2H9TL', 'cus_E5R0V'];
const BASE_SEC = 22051; // 06:07:31

function sig(e, x) {
  return 0.55 * Math.sin(x * 0.9 + e.ph) + 0.3 * Math.sin(x * 2.1 + e.ph * 2) + 0.15 * Math.sin(x * 5.3 + e.ph * 3);
}

function commas(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function hms(s) {
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor(s / 60) % 60;
  const x = s % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0');
}

function hash(n) {
  let x = (n | 0) + 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function smooth(pts) {
  let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ' Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
  }
  const l = pts[pts.length - 1];
  return d + ' L' + l[0].toFixed(1) + ' ' + l[1].toFixed(1);
}

function valAt(e, t, i) {
  return e.base * (1 + e.amp * sig(e, (t + i) * 0.1));
}

export default function Landing() {
  const [activeEvent, setActiveEvent] = useState(2);
  const [activeAgg, setActiveAgg] = useState(1);
  const [t, setT] = useState(0);

  useEffect(() => {
    const rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) return;
    const iv = setInterval(() => {
      setT((prev) => prev + 3);
    }, 300);
    return () => clearInterval(iv);
  }, []);

  const e = EVENTS[activeEvent] || EVENTS[2];

  // Chart calculation
  const N = 48;
  const pts = [];
  let lo = 1e12;
  let hi = -1e12;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const sg = sig(e, (t + i) * 0.1);
    const v = e.base * (1 + e.amp * sg);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
    sum += v;
    pts.push([(i * 600) / (N - 1), 118 - sg * 72]);
  }
  const line = smooth(pts);
  const last = pts[N - 1];
  const e2 = EVENTS[activeEvent === 0 ? 2 : 0];
  const sec = BASE_SEC + Math.floor(t / 10);
  const times = [];
  for (let k = 0; k < 6; k++) {
    times.push(hms(sec - 5 + k));
  }
  const chart = {
    title: e.title,
    unit: e.unit,
    value: commas(valAt(e, t, N - 1)),
    title2: e2.title,
    unit2: e2.unit,
    value2: commas(valAt(e2, t, N - 1)),
    line: line,
    area: line + ' L600 220 L0 220 Z',
    endTop: ((last[1] / 220) * 100).toFixed(2) + '%',
    times: times,
    peak: commas(hi),
    low: commas(lo),
    avg: commas(sum / N)
  };

  // Ingest rate calculation
  const bars = [];
  let hot = false;
  let lastV = 0;
  for (let i = 0; i < 56; i++) {
    const x = (t + i) * 0.1;
    const burst = Math.exp(-Math.pow(((x % 6) - 3) / 0.7, 2));
    const base = 0.3 + 0.1 * Math.sin(x * 1.3) + 0.08 * Math.sin(x * 3.7 + 1);
    const v = Math.min(1, base + 0.55 * burst);
    const isHot = v > 0.72;
    if (isHot && i > 40) hot = true;
    lastV = v;
    bars.push({ h: (8 + v * 92).toFixed(1) + '%', isHot, i });
  }
  const ingest = {
    bars: bars,
    peak: hot,
    rate: ((1800 + lastV * 9800) / 1000).toFixed(1) + 'k'
  };

  // Stream rows calculation
  const n = Math.floor(t / 9);
  const stream = [];
  for (let r = 0; r < 6; r++) {
    const idx = n - r;
    const ev = STREAM[hash(idx) % STREAM.length];
    stream.push({
      ts: hms(BASE_SEC + Math.floor(idx * 0.9)),
      name: ev.n,
      cust: CUST[hash(idx + 77) % CUST.length],
      qty: commas(ev.q(hash(idx + 13))) + ' ' + ev.u
    });
  }

  // Meter definition
  const A = AGGS[activeAgg] || AGGS[1];
  const meter = { value: A.v, unit: A.u, desc: A.d };

  // Quotas calculation
  const tok = 56 + Math.floor(t / 60);
  const api = 40 + Math.floor(t / 300);
  const views = 8006 + Math.floor(t / 5);
  function getStatus(p) { return p < 50 ? 'On track' : (p < 80 ? 'Watch' : 'Alert'); }
  function getPill(p) { return p < 50 ? '' : (p < 80 ? 'watch' : 'alert'); }
  const pt = (tok / 600) * 100;
  const pa = (api / 120) * 100;
  const pv = (views / 12320) * 100;
  const quotas = [
    { name: 'Usage', txt: tok + ' / 600 token', w: pt.toFixed(1) + '%', pct: pt.toFixed(0) + '% used', cls: 'f0', status: getStatus(pt), pillCls: getPill(pt) },
    { name: 'API', txt: api + ' / 120k hits', w: pa.toFixed(1) + '%', pct: pa.toFixed(0) + '% used', cls: 'f1', status: getStatus(pa), pillCls: getPill(pa) },
    { name: 'Page views', txt: commas(views) + ' / 12,320 page views', w: pv.toFixed(1) + '%', pct: pv.toFixed(0) + '% used', cls: 'f2', status: getStatus(pv), pillCls: getPill(pv) }
  ];
  const sums = { a: String(tok), b: String(api), c: Math.round(views / 1000) + 'k' };

  return (
    <div className="flexprice-page" id="top" style={{ '--accent': '#0B6E63' }}>
      <div className="wrap">
        {/* Navigation */}
        <header className="nav rise" style={{ '--i': 0 }}>
          <a className="brand" href="#top" aria-label="flexprice home">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h17A1.5 1.5 0 0 1 23 4.5V10H3z" fill="currentColor" />
              <path d="M3 12.5h20L13 23z" fill="currentColor" />
            </svg>
            flexprice
          </a>
          <nav className="navlinks" aria-label="Primary">
            <a href="#define">Define</a>
            <a href="#track">Track</a>
            <a href="#limits">Quotas</a>
            <Link to="/login">Docs</Link>
          </nav>
          <div className="navright">
            <Link className="signin" to="/login">Sign in</Link>
            <Link className="btn pri" to="/login">Book a demo</Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero">
          <div className="hero-split">
            {/* Left: Text Column */}
            <div className="hero-left">
              <div className="eyebrow rise" style={{ '--i': 1 }}>
                <i></i>Metering
              </div>
              <h1 className="disp rise" style={{ '--i': 2 }}>
                <span>Usage</span>
                <span>Metering</span>
              </h1>
              <div className="rise" style={{ '--i': 3 }}>
                <p className="lede">
                  Define granular usage events and track them in real time. Built to handle millions of events reliably, even during peak load.
                </p>
                <div className="actions">
                  <Link className="btn pri" to="/login">
                    Book a demo
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </Link>
                  <a className="btn sec" href="#define">See how events work</a>
                </div>
              </div>
            </div>

            {/* Right: Floating Cards Stage (Exact Asymmetric Layout: Rect Top-Right, Square Mid-Left, Square Bottom-Right) */}
            <div className="hero-right rise" style={{ '--i': 4 }}>
              <div className="hero-cards-stage">
                {/* SVG Connectors between Cards */}
                <svg className="hero-connectors" aria-hidden="true" viewBox="0 0 680 560" preserveAspectRatio="none">
                  {/* Connector 1: From Card 2 (top) to Card 1 (left) */}
                  <path className="conn-line" d="M 230 130 V 89 Q 230 75 244 75 H 360" />
                  {/* Connector 2: From Card 2 (right) to Card 3 (top) */}
                  <path className="conn-line" d="M 340 220 H 416 Q 430 220 430 234 V 260" />

                  {/* Glowing connector nodes */}
                  <circle className="conn-dot" cx="230" cy="130" r="4.5" />
                  <circle className="conn-dot" cx="360" cy="75" r="4.5" />
                  <circle className="conn-dot" cx="340" cy="220" r="4.5" />
                  <circle className="conn-dot" cx="430" cy="260" r="4.5" />
                </svg>

                {/* Card 1: TOP RIGHT RECTANGLE BOX (Event Details) */}
                <section className="card c-rect c-ev" aria-label="Event details">
                  <div className="ch">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink)' }}>
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      <span className="ct">Event Details</span>
                    </div>
                    <span className="tag">7 events</span>
                  </div>
                  <div className="chips">
                    {EVENTS.map((evItem, idx) => (
                      <button
                        key={evItem.name}
                        type="button"
                        className={idx === activeEvent ? 'chip on' : 'chip'}
                        aria-pressed={idx === activeEvent}
                        onClick={() => setActiveEvent(idx)}
                      >
                        {evItem.name}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Card 2: MIDDLE LEFT SQUARE BOX (Live Analytics) */}
                <section className="card c-square c-ch" aria-label="Live analytics">
                  <div className="ch">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink)' }}>
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      <span className="ct">Live analytics</span>
                    </div>
                    <span className="live tag"><i></i>Live</span>
                  </div>
                  <div className="kpis">
                    <div>
                      <div className="lbl">{chart.title}</div>
                      <div className="big">
                        <b>{chart.value}</b>
                        <small>{chart.unit}</small>
                      </div>
                    </div>
                    <div className="sub">
                      <div className="lbl">{chart.title2}</div>
                      <div className="big">
                        <b>{chart.value2}</b>
                        <small>{chart.unit2}</small>
                      </div>
                    </div>
                  </div>
                  <div className="plot" role="img" aria-label="Live line chart of the selected usage event over the last few seconds">
                    <svg viewBox="0 0 600 220" aria-hidden="true">
                      <line className="gl" x1="0" y1="46" x2="600" y2="46" />
                      <line className="gl" x1="0" y1="82" x2="600" y2="82" />
                      <line className="gl" x1="0" y1="118" x2="600" y2="118" />
                      <line className="gl" x1="0" y1="154" x2="600" y2="154" />
                      <line className="gl" x1="0" y1="190" x2="600" y2="190" />
                      <path className="area" d={chart.area} />
                      <path className="line" pathLength="1" d={chart.line} />
                    </svg>
                    <span className="end" style={{ top: chart.endTop }}></span>
                  </div>
                  <div className="times">
                    {chart.times.map((tm, idx) => (
                      <span key={idx}>{tm}</span>
                    ))}
                  </div>
                </section>

                {/* Card 3: BOTTOM RIGHT SQUARE BOX (Usage Quota) */}
                <section className="card c-square c-q" aria-label="Usage quota">
                  <div className="ch">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink)' }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      <span className="ct">Usage quota</span>
                    </div>
                    <span className="tag">cus_4F2K9</span>
                  </div>
                  <div className="qbody">
                    {quotas.map((q) => (
                      <div key={q.name}>
                        <div className="qh">
                          <span>{q.name}</span>
                          <span className="mono">{q.txt}</span>
                        </div>
                        <div className="track">
                          <i className={`fill ${q.cls}`} style={{ width: q.w }}></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="sums">
                    <div><span>Usage</span><b>{sums.a}</b><small>token</small></div>
                    <div><span>API hits</span><b>{sums.b}</b><small>hits</small></div>
                    <div><span>Page views</span><b>{sums.c}</b><small>views</small></div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Define */}
        <section className="sec" id="define">
          <div className="sh reveal">
            <div>
              <div className="eyebrow"><i></i>Define</div>
              <h2 className="disp" style={{ marginTop: '18px' }}>Meter anything your product does.</h2>
              <p className="sub">
                Describe an event once with a name, a property and an aggregation. Tokens, API calls, storage, FX transfers, page views and users all share the same shape.
              </p>
              <ul className="facts">
                <li><b>Name</b><span>A dotted name such as llm.completion or storage.write.</span></li>
                <li><b>Property</b><span>The field to read from each event: tokens, bytes or an amount.</span></li>
                <li><b>Aggregation</b><span>Count, sum, max or unique, applied per customer and billing window.</span></li>
              </ul>
            </div>
            <section className="card" aria-label="Meter definition">
              <div className="ch">
                <span className="ct">New meter</span>
                <span className="status"><i></i>Active</span>
              </div>
              <div className="fields">
                <div className="fr"><span>Event name</span><span className="v">llm.completion</span></div>
                <div className="fr"><span>Property</span><span className="v">tokens</span></div>
                <div className="fr">
                  <span>Aggregation</span>
                  <div className="seg" role="group" aria-label="Aggregation">
                    {AGGS.map((aggItem, idx) => (
                      <button
                        key={aggItem.k}
                        type="button"
                        className={idx === activeAgg ? 'on' : ''}
                        aria-pressed={idx === activeAgg}
                        onClick={() => setActiveAgg(idx)}
                      >
                        {aggItem.k}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="fr"><span>Window</span><span className="v">Hour</span></div>
                <div className="fr"><span>Filter</span><span className="v">region in ap-south-1, us-east-1</span></div>
              </div>
              <div className="preview">
                <div className="lbl">Preview · cus_4F2K9 · last hour · sample</div>
                <div className="big"><b>{meter.value}</b><small>{meter.unit}</small></div>
                <p>{meter.desc}</p>
              </div>
            </section>
          </div>
        </section>

        {/* Section: Track */}
        <section className="sec" id="track">
          <div className="sh reveal">
            <div>
              <div className="eyebrow"><i></i>Track</div>
              <h2 className="disp" style={{ marginTop: '18px' }}>Every event, counted as it lands.</h2>
            </div>
            <p className="sub" style={{ marginTop: '34px' }}>
              Ingestion is built to keep pace with bursts, so usage stays current during peak load and customers see the same numbers you do.
            </p>
          </div>
          <div className="two reveal">
            <section className="card" aria-label="Ingest rate">
              <div className="ch">
                <span className="ct">Ingest rate</span>
                <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {ingest.peak && <span className="peaktag">Peak load</span>}
                  <span className="tag">Sample traffic</span>
                </span>
              </div>
              <div className="kpis" style={{ paddingBottom: 0 }}>
                <div className="big"><b>{ingest.rate}</b><small>events/s</small></div>
              </div>
              <div className="bars" role="img" aria-label="Bar chart of events ingested per moment, with bursts highlighted">
                <div className="thr"><span>burst</span></div>
                {ingest.bars.map((b) => (
                  <i
                    key={b.i}
                    className={b.isHot ? 'ibar hot' : 'ibar'}
                    style={{ height: b.h, '--i': b.i }}
                  />
                ))}
              </div>
              <div className="stats3">
                <div><b>0</b>Dropped events</div>
                <div><b>0</b>Queued events</div>
                <div><b>5.6 s</b>Window shown</div>
              </div>
            </section>
            <section className="card" aria-label="Event stream">
              <div className="ch">
                <span className="ct">Event stream</span>
                <span className="live tag"><i></i>Receiving</span>
              </div>
              <div className="rows">
                <div className="rh"><span>Time</span><span>Event</span><span>Customer</span><span>Quantity</span></div>
                {stream.map((r, idx) => (
                  <div className="rw" key={idx}>
                    <span>{r.ts}</span>
                    <span>{r.name}</span>
                    <span>{r.cust}</span>
                    <span>{r.qty}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        {/* Section: Limits / Quotas */}
        <section className="sec" id="limits">
          <div className="lim reveal">
            <section className="card" aria-label="Quota status">
              <div className="ch">
                <span className="ct">Quota status</span>
                <span className="tag">Alert at 80%</span>
              </div>
              {quotas.map((q) => (
                <div className="lrow" key={q.name}>
                  <div className="lh">
                    <b>{q.name}</b>
                    <span className={`pill ${q.pillCls}`}>{q.status}</span>
                  </div>
                  <div className="ltrack">
                    <i className={`fill ${q.cls}`} style={{ width: q.w }}></i>
                    <span className="tick t80"></span>
                  </div>
                  <div className="scale">
                    <span>{q.txt}</span>
                    <span>{q.pct}</span>
                  </div>
                </div>
              ))}
              <div className="alertline">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2l6.5 11.5h-13z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M8 7v3M8 12v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Page views notify finance by email and webhook at 80% of the included amount.
              </div>
            </section>
            <div>
              <div className="eyebrow"><i></i>Quotas</div>
              <h2 className="disp" style={{ marginTop: '18px' }}>See where each customer stands.</h2>
              <p className="sub">
                Set included usage per plan and watch consumption against it. Flexprice flags a customer before they reach the limit, so overages never come as a surprise.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* Interactive Framer Footer with Halftone Sunrise Field */ }
     <InteractiveFooter />
    </div >
  
  );
}
