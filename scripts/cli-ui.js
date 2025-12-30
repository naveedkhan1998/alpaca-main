#!/usr/bin/env node

// Minimal CLI UI helpers (no external deps)

function supportsColor() {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR === '0') return false;

  // Let callers force color even in non-TTY contexts (e.g., Nx captured output).
  if (process.env.FORCE_COLOR !== undefined) return true;

  return Boolean(process.stdout.isTTY);
}

const useColor = supportsColor();
// Emoji are generally safe even when output is captured (Nx/CI logs).
// Allow opting out for plain logs via NO_EMOJI.
const useEmoji = process.env.NO_EMOJI === undefined;

const ansi = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function color(code, text) {
  if (!useColor) return text;
  return `${code}${text}${ansi.reset}`;
}

function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function padRight(text, width) {
  const visible = stripAnsi(text).length;
  if (visible >= width) return text;
  return text + ' '.repeat(width - visible);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m ${rs}s`;
}

function icon(fallback, emoji) {
  return useEmoji ? emoji : fallback;
}

function header(title, subtitle) {
  const line = `${title}${subtitle ? ` ${color(ansi.dim, '—')} ${color(ansi.dim, subtitle)}` : ''}`;
  console.log(`\n${color(ansi.bold, line)}\n`);
}

function section(title) {
  console.log(color(ansi.blue, `${icon('[*]', '🔹')} ${title}`));
}

function info(message) {
  console.log(`${icon('[i]', 'ℹ️')} ${message}`);
}

function success(message) {
  console.log(color(ansi.green, `${icon('[ok]', '✅')} ${message}`));
}

function warn(message) {
  console.log(color(ansi.yellow, `${icon('[!]', '⚠️')} ${message}`));
}

function errorLine(message) {
  console.error(color(ansi.red, `${icon('[x]', '❌')} ${message}`));
}

function commandHint(command) {
  return color(ansi.dim, `${icon('>', '›')} ${command}`);
}

function box({
  colorCode,
  title,
  bodyLines,
  footerLines
}) {
  const lines = [title, ...bodyLines, ...(footerLines?.length ? [''].concat(footerLines) : [])];
  const maxWidth = Math.max(...lines.map((l) => stripAnsi(l).length), 24);
  const border = '═'.repeat(Math.min(Math.max(maxWidth + 4, 40), 88));
  const top = `╔${border}╗`;
  const bottom = `╚${border}╝`;

  console.error(color(colorCode, `\n${top}`));
  for (const line of lines) {
    const padded = padRight(line, border.length);
    console.error(color(colorCode, `║ ${padded} ║`));
  }
  console.error(color(colorCode, `${bottom}${ansi.reset}\n`));
}

function errorBox(title, messageLines, nextSteps) {
  const body = Array.isArray(messageLines) ? messageLines : [String(messageLines)];
  const footer = nextSteps?.length
    ? [color(ansi.bold, 'Next steps:'), ...nextSteps.map((s) => commandHint(s))]
    : [];

  box({
    colorCode: ansi.red,
    title: color(ansi.bold, title),
    bodyLines: body,
    footerLines: footer
  });
}

function stepStart(label, details) {
  const suffix = details ? ` ${color(ansi.dim, details)}` : '';
  console.log(`${icon('[...]', '⏳')} ${label}${suffix}`);
  return Date.now();
}

function stepEnd(label, startedAtMs) {
  const took = typeof startedAtMs === 'number' ? ` (${formatDuration(Date.now() - startedAtMs)})` : '';
  success(`${label} done${took}`);
}

module.exports = {
  ansi,
  header,
  section,
  info,
  success,
  warn,
  errorLine,
  errorBox,
  commandHint,
  formatDuration,
  stepStart,
  stepEnd
};
