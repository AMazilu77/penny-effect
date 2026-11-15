// Turns Every.org's free-text `locationAddress` into city, state and ZIP.
//
// Shapes seen from the live API (2026-11-15):
//   "New York, New York, 10008 United States"
//   "AMERICUS, Georgia, 31709 United States"   (city sometimes in capitals)
//   "San Francisco, CA, USA"                   (no ZIP, state abbreviated)
// There is no street. Anything we can't read confidently returns null, so a
// format change at Every.org never writes a wrong city over a right one.

const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY",
  louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "puerto rico": "PR", guam: "GU", "virgin islands": "VI", "u.s. virgin islands": "VI",
  "american samoa": "AS", "northern mariana islands": "MP",
};
const STATE_CODES = new Set(Object.values(STATES));

const US_NAMES = new Set(["united states", "united states of america", "usa", "us", "u.s.", "u.s.a."]);

export type OrgLocation = { city: string; state: string; zip: string | null };

/** "NEW YORK" → "New York"; mixed-case names ("McAllen", "DeLand") are kept as written. */
function cityName(raw: string): string {
  if (raw !== raw.toUpperCase()) return raw;
  return raw.toLowerCase().replace(/(^|[\s\-'.])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Two-letter USPS code for a state name or code, or null. */
export function stateCode(raw: string): string | null {
  const s = raw.trim();
  if (/^[A-Za-z]{2}$/.test(s) && STATE_CODES.has(s.toUpperCase())) return s.toUpperCase();
  return STATES[s.toLowerCase().replace(/\s+/g, " ")] ?? null;
}

/** City, state code and (if present) 5-digit ZIP of a US address, or null. */
export function parseEveryOrgAddress(address: string | null | undefined): OrgLocation | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return null;

  // The tail after city and state: "10008 United States", "USA", "10008", or "NY 10008" squeezed into part 2.
  const [city, firstState, ...rest] = parts;
  let statePart = firstState;
  let tail = rest.join(" ");
  const squeezed = /^([A-Za-z .]+?)\s+(\d{5}(?:-\d{4})?)$/.exec(statePart);
  if (squeezed && stateCode(squeezed[1])) {
    statePart = squeezed[1];
    tail = `${squeezed[2]} ${tail}`;
  }

  const state = stateCode(statePart);
  if (!state || !city || city.length > 80 || /\d/.test(city)) return null;

  const zipMatch = /^(\d{5})(?:-\d{4})?\b\s*(.*)$/.exec(tail.trim());
  const zip = zipMatch ? zipMatch[1] : null;
  const country = (zipMatch ? zipMatch[2] : tail).trim().toLowerCase();
  if (country && !US_NAMES.has(country)) return null;

  return { city: cityName(city), state, zip };
}

/** Organization columns for an Every.org address; empty when it can't be read (existing values stay). */
export function orgLocationFields(address: string | null | undefined) {
  const loc = parseEveryOrgAddress(address);
  return loc ? { locationCity: loc.city, locationState: loc.state, locationZip: loc.zip, locationCountry: "US" } : {};
}
