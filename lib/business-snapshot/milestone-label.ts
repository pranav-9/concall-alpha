// A one- or two-word heading for a timeline milestone ("Founded", "IPO", "Capacity"), read off the
// milestone's own title by keyword. First matching rule wins, so the order is deliberate: a listing
// that mentions a plant is still an IPO. A title no rule recognises gets no heading.
const RULES: [string, RegExp][] = [
  ["Renamed", /\brenam|name change|changes its name|rebrand/],
  ["Main board", /main board|mainboard/],
  ["IPO", /\bipo\b|\blists?\b|\blisted\b|listing|goes public|public issue/],
  ["Demerger", /demerg|spun off|spin-off|carve/],
  ["Merger", /\bmerge[sd]?\b|merger|amalgamat/],
  ["Acquisition", /acquir|acquisition|\bbuys?\b|buyout|takes over|takeover|board control|agreement to buy/],
  ["Investment", /\bstake\b|strategic investment|invests? in\b/],
  ["Fundraise", /\bqip\b|\braises\b|fund ?rais|preferential|rights issue|private equity/],
  ["Joint venture", /joint venture|\bjv\b|partnership with|partners with|ties up|tie-up|collaborat|alliance/],
  ["Order win", /\borders?\b|contract|\bwins\b|awarded|supply agreement|\bloi\b/],
  ["Approval", /approv|certif|accredit|qualif|licen[cs]e|clearance|usfda|inspection|consent|exempts/],
  ["R&D", /r&d|research cent|research and development|\blabs?\b/],
  // "began"/"begins" alone is not a founding: a plant "began operating", a company "began exporting".
  // Only an operations/business start is (KRN 2026-10-03: both read "Founded"); began making/supplying is a new line.
  ["New line", /\b(?:began|begins) (?:making|producing|supplying|manufacturing)\b/],
  ["Founded", /\bfound|incorporat|\bestablish|set up as|\b(?:began|begins) (?:operations|business|trading|its|with)\b|operations began|inception|starts with|starts as|started as|started in|started by|starts its first|commences business/],
  ["Capacity", /plant|facility|capacity|commission|inaugurat|expan|factory|\bunits?\b|\blines?\b|greenfield|brownfield|capex|campus|\bsite\b|\bmill\b|groundbreaking|\bkl\b|mtpa/],
  ["New line", /launch|introduc|\benter(s|ed)?\b|entry into|new product|new business|diversif|foray|starts making|started|\badded\b|\badds\b|localis/],
  ["First delivery", /\bfirst\b.*(deliver|shipment|system|cluster|sale)|deliver(s|ed)? its first|deployed/],
  ["Overseas", /subsidiary|export|overseas|international|global|abroad/],
  ["Leadership", /\bceo\b|\bmd\b|chairman|appoint|promoter|succession/],
  ["Rating", /credit rating|rating (raised|upgraded)/],
  ["Share split", /shares? split|stock split|bonus issue/],
  ["Restructuring", /restructur|\bexit\b|exits\b|focus shifts|reported apart/],
  ["Milestone", /record|highest|crosses|surpass|reaches/],
];

export function milestoneLabel(title: string): string | null {
  const text = title.toLowerCase();
  return RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}
