import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'profile.config.json'), 'utf8'));

const THEMES = {
  light: {
    text: '#255DF6',
    dots: ['#EBEDF0', '#A7BEFB', '#628BF9', '#4071F7', '#255DF6'],
    border: 'rgb(0 0 0 / 0.06)',
  },
  dark: {
    text: '#255DF6',
    dots: ['#171B21', '#152A62', '#2048B3', '#1951EB', '#0048FF'],
    border: 'rgb(0 0 0 / 0.06)',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sharedCss(theme, height, extra) {
  const t = THEMES[theme];
  return `
:root {
  --color-text: ${t.text};
  --color-dot-bg-0: ${t.dots[0]};
  --color-dot-bg-1: ${t.dots[1]};
  --color-dot-bg-2: ${t.dots[2]};
  --color-dot-bg-3: ${t.dots[3]};
  --color-dot-bg-4: ${t.dots[4]};
  --color-dot-border: ${t.border};
  --default-delay: 0.15s;
  --default-duration: 0.7s;
  --default-stagger: 0.02s;
  --animate-in-menu-delay: calc(var(--default-delay) + var(--default-stagger) * 0);
  --animate-in-links-delay: calc(var(--default-delay) + var(--default-stagger) * 1);
  --animate-in-contributions-delay: calc(var(--default-delay) + var(--default-stagger) * 5);
  --animate-in-readme-delay: calc(var(--default-delay) + var(--default-stagger) * 6);
  --animate-in-graph-delay: calc(var(--default-delay) + var(--default-stagger) * 17);
}
*, *::before, *::after { box-sizing: border-box; }
.grid { display: grid; grid-template-columns: repeat(6, 1fr); }
.wrapper {
  contain: strict;
  block-size: ${height}px;
  container-type: inline-size;
  position: relative;
  overflow: clip;
  font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
  color: var(--color-text);
}
@-moz-document url-prefix() { .wrapper { display: none; } }
.label { contain: content; font-size: 14px; font-weight: 600; }
.link { contain: content; font-size: 14px; }
.fade-in {
  display: inline-block;
  will-change: transform;
  animation-name: fade-in;
  animation-fill-mode: both;
  animation-duration: var(--duration, var(--default-duration));
  animation-timing-function: var(--ease, ease-out);
  animation-delay: var(--delay, var(--default-delay));
}
p { margin: 0; }
@keyframes fade-in { 0% { transform: translateY(5px); } 100% { transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .fade-in, .shine, .link__arrow, .years { animation: none !important; }
}
.shine {
  background-color: var(--color-text);
  background-image: linear-gradient(-75deg, rgb(0 0 0 / 0) 0%, rgb(255 255 255 / 0.18) 15%, rgb(0 0 0 / 0) 25%);
  background-size: 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  animation-name: shine;
  animation-duration: 14s;
  animation-iteration-count: infinite;
}
@keyframes shine {
  0% { background-position: 200%; }
  10% { background-position: 0%; }
  to { background-position: 0%; }
}
${extra}
`;
}

function svgShell({ theme, width, height, css, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" height="${height}" data-theme="${theme}" width="${width}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <style>${css}</style>
      ${body}
    </div>
  </foreignObject>
</svg>`;
}

async function getContributions(username) {
  try {
    const res = await fetch(`https://github.com/users/${username}/contributions`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (res.ok) {
      const html = await res.text();
      const cells = html.match(/<td[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g) || [];
      const days = [];
      for (const cell of cells) {
        const date = (cell.match(/data-date="([^"]+)"/) || [])[1];
        const lvl = Number((cell.match(/data-level="(\d+)"/) || [])[1] ?? 0);
        if (date) days.push({ date, level: Math.min(4, lvl) });
      }
      if (days.length >= 300) return { days: days.slice(-371), source: 'github' };
    }
  } catch {
    /* offline: fall through to generated data */
  }
  const days = [];
  const start = new Date();
  start.setDate(start.getDate() - 364);
  for (let i = 0; i < 365; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d.toISOString().slice(0, 10), level: Math.random() < 0.12 ? 1 + Math.floor(Math.random() * 4) : 0 });
  }
  return { days, source: 'generated' };
}

function topSvg(theme, count) {
  const css = sharedCss(theme, 20, `
:root { --size-height: 20; }
.wrapper { align-items: center; }
.menu { --delay: var(--animate-in-menu-delay); contain: content; text-align: left; grid-area: 1 / 1 / span 1 / span 2; }
.contributions { --delay: var(--animate-in-contributions-delay); contain: strict; grid-area: 1 / 3 / span 1 / span 2; }
.readme { --delay: var(--animate-in-readme-delay); contain: content; text-align: right; grid-area: 1 / 5 / span 1 / span 2; }
@media (width > 550px) {
  .contributions { contain: content; }
}
@media (width > 700px) {
  .menu { grid-area: 1 / 1 / span 1 / span 3; }
  .contributions { grid-area: 1 / 4 / span 1 / span 2; }
  .readme { grid-area: 1 / 6 / span 1 / span 1; }
}
`);
  const body = `<div class="wrapper grid label">
  <div class="menu fade-in">Menu</div>
  <div class="contributions fade-in"><span class="shine">${esc(count)}</span> ${esc(config.contributionLabel)}</div>
  <div class="readme fade-in">readme.md</div>
</div>`;
  return svgShell({ theme, width: '100%', height: 20, css, body });
}

function mainSvg(theme, days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const cols = weeks
    .map((w) => `<div class="week">${w.map((d) => `<div class="dot dot--${d.level}"></div>`).join('')}</div>`)
    .join('');
  const graphWidth = weeks.length * 29;

  const css = sharedCss(theme, 196, `
:root { --size-height: 196; }
.wrapper { align-items: center; }
.graph { --delay: var(--animate-in-graph-delay); width: 100%; }
.years {
  display: flex; gap: 5px;
  contain: strict;
  inline-size: ${graphWidth * 2}px;
  block-size: 168px;
  will-change: transform;
  backface-visibility: hidden;
  transform: translateZ(0);
  animation-name: scroll;
  animation-timing-function: linear;
  animation-duration: 90s;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
  animation-delay: 1s;
}
@keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-${graphWidth}px); } }
.week { display: flex; flex-direction: column; gap: 5px; }
.dot {
  contain: strict;
  width: 24px; height: 24px;
  border: 1.8px solid var(--color-dot-border);
  border-radius: 4px;
}
.dot--0 { background-color: var(--color-dot-bg-0); }
.dot--1 { background-color: var(--color-dot-bg-1); }
.dot--2 { background-color: var(--color-dot-bg-2); }
.dot--3 { background-color: var(--color-dot-bg-3); }
.dot--4 { background-color: var(--color-dot-bg-4); }
`);

  const body = `<main class="wrapper"><article class="graph"><div class="years">${cols}${cols}</div></article></main>`;
  return svgShell({ theme, width: '100%', height: 196, css, body });
}

async function getGithubStats(username) {
  const headers = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/vnd.github+json' };
  try {
    const u = await (await fetch(`https://api.github.com/users/${username}`, { headers })).json();
    const repos = await (await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers })).json();
    if (!Array.isArray(repos)) throw new Error('repos');
    const langs = {};
    for (const r of repos) if (r.language) langs[r.language] = (langs[r.language] || 0) + 1;
    return {
      repos: u.public_repos ?? repos.length,
      followers: u.followers ?? 0,
      following: u.following ?? 0,
      stars: repos.reduce((a, r) => a + (r.stargazers_count || 0), 0),
      langs: Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  } catch {
    return { repos: 16, followers: 2, following: 2, stars: 1, langs: [['TypeScript', 5], ['Python', 2], ['JavaScript', 1]] };
  }
}

function statCards(theme, stats) {
  const common = `
:root { --size-height: 100%; }
.wrapper { padding: 18px 20px; }
.card { height:100%; border:1px solid var(--color-dot-bg-0); border-radius:10px; display:flex; flex-direction:column; justify-content:center; }
.title { font-size:13px; font-weight:600; margin-bottom:16px; }
.row { display:flex; gap:26px; }
.cell { display:flex; flex-direction:column; }
.cell b { font-size:23px; font-weight:600; line-height:1.1; }
.cell span { font-size:11px; opacity:0.65; }
`;
  const statBody = `<main class="wrapper"><div class="card">
  <div class="title">GitHub Stats</div>
  <div class="row">
    <div class="cell"><b>${stats.repos}</b><span>Repos</span></div>
    <div class="cell"><b>${stats.followers}</b><span>Followers</span></div>
    <div class="cell"><b>${stats.following}</b><span>Following</span></div>
    <div class="cell"><b>${stats.stars}</b><span>Stars</span></div>
  </div>
</div></main>`;

  const max = Math.max(...stats.langs.map(([, n]) => n), 1);
  const langRows = stats.langs
    .map(([name, n]) => `<div class="lang"><span>${esc(name)}</span><div class="bar"><div class="fill" style="width:${Math.round((n / max) * 100)}%"></div></div><em>${n}</em></div>`)
    .join('');
  const langCss = `${common}
.lang { display:flex; align-items:center; gap:10px; margin-bottom:7px; font-size:11px; }
.lang > span { width:76px; }
.lang .bar { height:6px; border-radius:3px; background:var(--color-dot-bg-0); flex:1; overflow:hidden; }
.lang .fill { height:100%; background:var(--color-text); border-radius:3px; }
.lang em { font-style:normal; opacity:0.65; width:14px; text-align:right; }
`;
  const langBody = `<main class="wrapper"><div class="card"><div class="title">Top Languages</div>${langRows}</div></main>`;

  return {
    stats: svgShell({ theme, width: 420, height: 120, css: sharedCss(theme, 120, common), body: statBody }),
    langs: svgShell({ theme, width: 420, height: 150, css: sharedCss(theme, 150, langCss), body: langBody }),
  };
}

function streakCardSvg(theme, streak) {
  const css = sharedCss(theme, 140, `
:root { --size-height: 140; }
.wrapper { padding: 16px 20px; }
.card { height:100%; border:1px solid var(--color-dot-bg-0); border-radius:10px;
  display:flex; flex-direction:column; justify-content:center; gap:12px; }
.title { font-size:13px; font-weight:600; }
.row { display:flex; gap:26px; }
.cell { display:flex; flex-direction:column; }
.cell b { font-size:24px; font-weight:600; line-height:1.05; }
.cell span { font-size:10px; opacity:0.65; }
.cell small { font-size:9px; opacity:0.55; margin-top:2px; }
.years { font-size:11px; opacity:0.7; }
`);
  const years = Object.entries(streak.years).sort((a, b) => b[0] - a[0]).map(([y, n]) => `${y}: ${n}`).join('  ·  ');
  const body = `<main class="wrapper"><div class="card">
  <div class="title">Contributions</div>
  <div class="row">
    <div class="cell"><b>${streak.total}</b><span>Total</span><small>${esc(years)}</small></div>
    <div class="cell"><b>${streak.current}</b><span>Current streak</span><small>${esc(streak.currentDate)}</small></div>
    <div class="cell"><b>${streak.longest}</b><span>Longest streak</span><small>${esc(streak.longestRange)}</small></div>
  </div>
</div></main>`;
  return svgShell({ theme, width: 420, height: 140, css, body });
}

function buildHeader(cfg) {
  const lines = [];
  lines.push(`<img width="100%" src="assets/hero-banner-harshdev.gif" alt="${esc(cfg.name)}" />`, '');
  lines.push(`<h1 align="center">Hello Traveller, I'm ${esc(cfg.name)} 👋</h1>`, '');
  lines.push('<br>', '<div align="center">');
  cfg.badges.forEach((b) => {
    let src = b.src;
    if (!src) {
      let url = `https://img.shields.io/badge/${encodeURIComponent(b.label)}-${encodeURIComponent((b.value || '').replace(/-/g, '--'))}-${b.color}?style=for-the-badge`;
      if (b.logo) {
        url += `&logo=${encodeURIComponent(b.logo)}`;
        if (b.logoColor) url += `&logoColor=${encodeURIComponent(b.logoColor)}`;
      }
      src = url;
    }
    if (b.url) {
      lines.push(`  <a href="${b.url}"><img src="${src}" alt="${esc(b.label)}" /></a>`);
    } else {
      lines.push(`  <img src="${src}" alt="${esc(b.label)}" />`);
    }
  });
  lines.push('</div>', '');
  return lines.join('\n');
}

function buildBody(cfg) {
  const s = cfg.stats;
  const a = cfg.about;
  const lines = [];

  lines.push('## About Me', '');
  lines.push('<div>');
  lines.push(`  <img src="assets/avatar.webp" align="right" width="200px" alt="${esc(cfg.name)}" />`);
  lines.push('  <p align="left">', '   &nbsp;');
  a.facts.forEach((f) => lines.push(`   &nbsp;&#10022; ${f}<br>`));
  lines.push('  </p>', '</div>', '', '<br clear="all" />', '', '---', '');

  lines.push('## Tech Stack', '');
  cfg.techStack.forEach((t) => {
    lines.push(`### ${t.title}`);
    lines.push('<p align="left">');
    if (t.icons) lines.push(`  <img src="https://skillicons.dev/icons?i=${t.icons}&theme=dark" alt="${esc(t.title)}" />`);
    (t.customIcons || []).forEach((src) => lines.push(`  <img src="${src}" width="48" height="48" alt="" />`));
    lines.push('</p>', '');
    if (t.note) lines.push(`> ${t.note}`, '');
  });
  lines.push('---', '');

  lines.push('## Featured Projects', '', '<table>');
  for (let i = 0; i < cfg.projects.length; i += 2) {
    lines.push('  <tr>');
    cfg.projects.slice(i, i + 2).forEach((p) => {
      lines.push('    <td width="50%">');
      lines.push(`      <h3>${p.name}</h3>`);
      lines.push(`      <a href="${p.live}"><img src="https://img.shields.io/badge/Live%20Demo-255DF6?style=for-the-badge" alt="Live demo" /></a>`);
      lines.push(`      <a href="${p.github}"><img src="https://img.shields.io/badge/GitHub-0f172a?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>`);
      lines.push('      <br/><br/>', '      <ul>');
      p.points.forEach((pt) => lines.push(`        <li>${pt}</li>`));
      lines.push('      </ul>', '    </td>');
    });
    lines.push('  </tr>');
  }
  lines.push('</table>', '', '---', '');

  lines.push('## GitHub Stats', '', '<div align="center">');
  lines.push('<picture><source media="(prefers-color-scheme: dark)" srcset="assets/stats-dark.svg"><img width="49%" src="assets/stats-light.svg" alt="GitHub stats" /></picture>');
  lines.push('<picture><source media="(prefers-color-scheme: dark)" srcset="assets/streak-dark.svg"><img width="49%" src="assets/streak-light.svg" alt="Contribution streak" /></picture>');
  lines.push('<br />');
  lines.push('<picture><source media="(prefers-color-scheme: dark)" srcset="assets/langs-dark.svg"><img width="40%" src="assets/langs-light.svg" alt="Top languages" /></picture>');
  lines.push('</div>', '', '---', '');

  if (a.philosophyAuthor) {
    lines.push('## Philosophy', '', '<div align="center">', '', `> *"${a.philosophy}"*`, '>', `> — **${a.philosophyAuthor}**`, '', '</div>', '', '---', '');
  } else {
    lines.push('## Philosophy', '', '<div align="center">', '', `> *"${a.philosophy}"*`, '', '</div>', '', '---', '');
  }

  const footer = cfg.footer || {
    heading: 'Thank you for reading 🙋🏻‍♂️',
    gif: 'https://i.pinimg.com/originals/cc/85/19/cc8519f9b3f798c87451e5c78b9e1629.gif',
    goodbyeGif: 'assets/goodbye.gif',
    goodbyeText: 'Thanks for visiting, bye 👋'
  };

  lines.push('<div>');
  lines.push(`  <h2 align="center">${esc(footer.heading)}</h2>`);
  lines.push('  <div align="center">');
  lines.push(`    <img src="${footer.gif}" width="500" alt="Thank you for reading" />`);
  lines.push('  </div>', '</div>');

  if (footer.goodbyeGif) {
    lines.push('', '<br>', '<br>', '');
    lines.push('<div align="center">');
    lines.push(`  <img src="${footer.goodbyeGif}" width="100%" alt="${esc(footer.goodbyeText || '')}" />`);
    if (footer.goodbyeText) {
      lines.push(`  <p align="center">${esc(footer.goodbyeText)}</p>`);
    }
    lines.push('</div>');
  }
  return lines.join('\n');
}

const { days, source } = await getContributions(config.username);
const ghStats = await getGithubStats(config.username);
const total = Number(config.contributionTotal ?? 0);
const label = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);

for (const f of fs.readdirSync(ASSETS)) {
  if (/^(?:link-\d+|top|main|fallback)-(?:light|dark)\.svg$/.test(f)) fs.unlinkSync(path.join(ASSETS, f));
}

const files = [];
for (const theme of ['light', 'dark']) {
  files.push([`top-${theme}.svg`, topSvg(theme, label)]);
  files.push([`main-${theme}.svg`, mainSvg(theme, days)]);
  const cards = statCards(theme, ghStats);
  files.push([`stats-${theme}.svg`, cards.stats]);
  files.push([`langs-${theme}.svg`, cards.langs]);
  files.push([`streak-${theme}.svg`, streakCardSvg(theme, config.streak)]);
}
for (const [name, content] of files) fs.writeFileSync(path.join(ASSETS, name), content);

const hero = `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/top-dark.svg">
  <img src="assets/top-light.svg" width="100%" height="20" align="left" alt="">
</picture>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/main-dark.svg">
  <img src="assets/main-light.svg" alt="Contribution graph for the last year" width="100%" height="196" align="left">
</picture>
<br clear="all" />

---

`;

const readme = `${buildHeader(config)}
${hero}
${buildBody(config)}
`;
fs.writeFileSync(path.join(ROOT, 'README.md'), readme);

const preview = `<!doctype html>
<html><head><meta charset="utf-8"><title>Profile README preview</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
  body { margin:0; padding:24px; background:#fff; color:#1f2328; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; max-width:1100px; }
  @media (prefers-color-scheme: dark) { body { background:#0d1117; color:#e6edf3; } }
  img { display:inline-block; max-width:100%; }
  table { border-collapse:collapse; } td { border:1px solid #30363d; padding:10px; vertical-align:top; }
</style></head><body>
<div id="preview"></div>
<script type="text/markdown" id="src">${readme}</script>
<script src="preview.js"></script>
</body></html>`;
fs.writeFileSync(path.join(ROOT, 'preview.html'), preview);

const previewJs = String.raw`
const raw = document.getElementById('src').textContent;
const src = raw.replace(/\[!\[([^\]]+)\]\(([^)]+)\)\]\(([^)]+)\)/g, '<a href="$3"><img src="$2" alt="$1" /></a>');
document.getElementById('preview').innerHTML = marked.parse(src);
`;
fs.writeFileSync(path.join(ROOT, 'preview.js'), previewJs);

console.log(`Generated ${files.length} SVGs + README.md + preview.html`);
