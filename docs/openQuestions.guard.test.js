import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Every open question has its own number.
 *
 * Two sessions added a Q17 and a Q18 on 2026-10-14 without noticing the file already had both — the
 * earlier pair are `##` headings and the later pair `###`, so neither grep for one level saw the other.
 * A register where two rows share an id is worse than no register: "answer Q17" stops meaning anything,
 * and the owner's reply lands against the wrong question.
 *
 * Cheap to pin, and exactly the kind of thing a person reading a 600-line document will not catch.
 */
const DOC = path.join(process.cwd(), 'docs', 'OPEN-QUESTIONS.md');

/** Every question heading, at any heading level. */
function questions() {
  const lines = fs.readFileSync(DOC, 'utf8').split(/\r?\n/);
  const found = [];
  lines.forEach((line, i) => {
    const m = /^#{2,4}\s+Q(\d+)\s*(?:—|-|–|:)?\s*(.*)$/.exec(line);
    if (m) found.push({ n: Number(m[1]), title: m[2].trim(), line: i + 1 });
  });
  return found;
}

describe('docs/OPEN-QUESTIONS.md', () => {
  it('is there at all', () => {
    expect(fs.existsSync(DOC)).toBe(true);
    expect(questions().length).toBeGreaterThan(5);
  });

  it('never reuses a question number', () => {
    const seen = new Map();
    const clashes = [];
    for (const q of questions()) {
      if (seen.has(q.n)) {
        clashes.push(`Q${q.n}: line ${seen.get(q.n).line} "${seen.get(q.n).title}" and line ${q.line} "${q.title}"`);
      } else {
        seen.set(q.n, q);
      }
    }
    expect(clashes, `Two questions share a number, so an answer cannot be filed against one:\n  ${clashes.join('\n  ')}`).toEqual([]);
  });

  it('leaves no gaps, so the next number is obvious', () => {
    // Not correctness, but it is what makes picking the next number safe: if the highest is also the
    // count, "the next one" is unambiguous. A gap means a question was deleted rather than answered.
    const ns = questions().map((q) => q.n).sort((a, b) => a - b);
    const missing = [];
    for (let i = 1; i <= ns[ns.length - 1]; i += 1) if (!ns.includes(i)) missing.push(i);
    expect(missing, `Numbers with no question: ${missing.join(', ')}. Answered questions stay in the file.`).toEqual([]);
  });

  it('gives every question a status', () => {
    // A question with no status is one nobody can tell is still waiting.
    const text = fs.readFileSync(DOC, 'utf8');
    const sections = text.split(/^#{2,4}\s+Q\d+/m).slice(1);
    const withoutStatus = sections
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !/\*\*Status:\*\*/.test(s))
      .map(({ i }) => questions()[i]?.n);
    expect(withoutStatus, `Questions with no **Status:** line: ${withoutStatus.join(', ')}`).toEqual([]);
  });
});
