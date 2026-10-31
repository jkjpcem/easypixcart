export type RosterRow = { name: string; group_label: string | null; email: string | null };

function splitLine(line: string) {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { cells.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

// Columns: name, group (class/team), email. A header row is detected and skipped.
export function parseRoster(text: string): RosterRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = lines.map(splitLine);
  if (rows[0] && /^(student|child|player|name)/i.test(rows[0][0])) rows.shift();
  return rows
    .filter((r) => r[0])
    .map((r) => ({ name: r[0], group_label: r[1] || null, email: r[2] || null }));
}
