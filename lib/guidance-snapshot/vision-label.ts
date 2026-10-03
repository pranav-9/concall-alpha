// Splits forward_strength.horizons.long_term.vision_label — the company's own
// name or number for its multi-year frame — into the part the long-term card
// sets as its hero and the part it leads the body with.
//
//   "'Vision 2030': Rs. 2,500 crores by FY30"  → name "Vision 2030", detail "Rs. 2,500 crores by FY30"
//   "'Advait 2030'"                            → name "Advait 2030"
//   "$350-400mn revenue in FY31 (~3x FY26)"    → name "$350-400mn revenue in FY31", detail "~3x FY26"
//   "Rs 10,000 cr revenue by FY29-FY31"        → name = the whole label
//
// `quoted` is true only when the name is the company's own coinage: the
// producer wrapped it in quote marks, or it is a "Vision 2030"-style title. A
// plain target ("7,600+ beds by FY30") is the producer's near-verbatim
// summary, so the card must not put quote marks around it.

export type VisionLabelParts = {
  name: string;
  detail: string | null;
  quoted: boolean;
};

const QUOTE_CHARS = "'\"‘’“”";
const LEADING_QUOTED = new RegExp(`^[${QUOTE_CHARS}]([^${QUOTE_CHARS}]+)[${QUOTE_CHARS}]\\s*(.*)$`);
// A separator between a name and what it stands for. ": " needs the space so
// a ratio like "5k:1k" stays whole; dashes need a space on both sides so a
// range like "FY29-FY31" stays whole.
const SEPARATOR = /:\s+|\s+[—–-]\s+/;
const LEADING_SEPARATOR = /^(?::|[—–-])\s*/;
const TRAILING_PAREN = /^(.*\S)\s*\(([^()]+)\)$/;
const NAMED_FRAME = /^(vision|target|mission)\s+\d{4}$/i;
// Past this a "name" before a separator is a clause, not a name.
const MAX_NAME_CHARS = 28;

function capitalise(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function clean(text: string): string | null {
  const trimmed = text.trim();
  return trimmed ? capitalise(trimmed) : null;
}

export function splitVisionLabel(label: string | null | undefined): VisionLabelParts | null {
  const raw = label?.trim();
  if (!raw) return null;

  const quotedMatch = raw.match(LEADING_QUOTED);
  if (quotedMatch) {
    const rest = quotedMatch[2].replace(LEADING_SEPARATOR, "");
    return { name: quotedMatch[1].trim(), detail: clean(rest), quoted: true };
  }

  const separator = raw.match(SEPARATOR);
  if (separator && separator.index !== undefined) {
    const name = raw.slice(0, separator.index).trim();
    const detail = raw.slice(separator.index + separator[0].length);
    if (name && name.length <= MAX_NAME_CHARS && detail.trim()) {
      return { name, detail: clean(detail), quoted: NAMED_FRAME.test(name) };
    }
  }

  const paren = raw.match(TRAILING_PAREN);
  if (paren) {
    return { name: paren[1], detail: clean(paren[2]), quoted: false };
  }

  return { name: raw, detail: null, quoted: NAMED_FRAME.test(raw) };
}
