// GET /api/charities?q=water
type Charity = {
  ein: string;
  name: string;
  city?: string;
  state?: string;
  mission?: string;
  website?: string;
  rating?: number;
};

const MOCK: Charity[] = [
  {
    ein: "12-3456789",
    name: "Clean Water Fund",
    city: "Austin",
    state: "TX",
    mission: "Providing access to clean drinking water worldwide.",
    website: "https://example.org",
    rating: 4.8,
  },
  {
    ein: "98-7654321",
    name: "Open Source Grants",
    city: "San Francisco",
    state: "CA",
    mission: "Funding critical open source infrastructure.",
    website: "https://example.com",
    rating: 4.5,
  },
  {
    ein: "00-1111111",
    name: "Food For All",
    city: "Chicago",
    state: "IL",
    mission: "Reducing hunger with community programs.",
    website: "https://example.net",
    rating: 4.2,
  },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase();

  const results = !q
    ? MOCK.slice(0, 10)
    : MOCK.filter((c) =>
        [c.name, c.mission, c.city, c.state].filter(Boolean)
          .map((s) => s!.toLowerCase())
          .some((s) => s.includes(q))
      );

  return Response.json(results);
}
