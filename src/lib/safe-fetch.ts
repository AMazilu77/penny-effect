// Fetching URLs that come from admins or third-party pages (news source
// pages, og:image links, Every.org logos) without letting them reach our
// own infrastructure ("SSRF"). Server-only.
//
// Rules:
// - http(s) only, standard ports only (80/443), no credentials in the URL;
// - every address a hostname resolves to must be public: private, loopback,
//   link-local (incl. cloud metadata 169.254.169.254), carrier-grade NAT,
//   multicast and reserved ranges are refused. The check runs inside the
//   connection's own DNS lookup, so a hostname can't pass the check and then
//   resolve somewhere else ("DNS rebinding");
// - redirects are followed by hand (max 3), each one checked the same way;
// - a timeout, a maximum body size, an allowed content-type list, and no
//   cookies or credentials are ever sent.
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { LookupFunction } from "node:net";

export class SafeFetchError extends Error {
  constructor(
    readonly reason:
      | "bad-url"
      | "blocked-address"
      | "too-many-redirects"
      | "timeout"
      | "too-large"
      | "bad-status"
      | "bad-type"
      | "network",
  ) {
    super(`safe fetch failed: ${reason}`);
    this.name = "SafeFetchError";
  }
}

// ---- Address rules (pure, unit-tested) ----

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((n, part) => n * 256 + Number(part), 0);
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, incl. cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, incl. broadcast
];

function isPublicIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return !BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((n & mask) >>> 0) === ((ipv4ToInt(base) & mask) >>> 0);
  });
}

/** True only for globally routable unicast addresses. */
export function isPublicIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPublicIpv4(ip);
  if (version !== 6) return false;
  const v6 = ip.toLowerCase();
  // IPv4-mapped (::ffff:1.2.3.4): judge the embedded IPv4 address.
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIpv4(mapped[1]);
  if (v6 === "::" || v6 === "::1") return false;
  // Only global unicast (2000::/3) is public; this excludes unique-local
  // (fc00::/7), link-local (fe80::/10), multicast (ff00::/8) and the rest.
  if (!/^[23]/.test(v6)) return false;
  // Inside 2000::/3, the documentation range 2001:db8::/32 isn't routable either.
  if (v6.startsWith("2001:db8:")) return false;
  return true;
}

/** Parses and checks a URL's shape (not its address). */
export function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeFetchError("bad-url");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new SafeFetchError("bad-url");
  if (url.username || url.password) throw new SafeFetchError("bad-url");
  if (url.port && url.port !== "80" && url.port !== "443") throw new SafeFetchError("bad-url");
  // A literal IP in the URL is checked here too (the lookup below isn't called for it).
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && !isPublicIp(host)) throw new SafeFetchError("blocked-address");
  return url;
}

// ---- Fetching ----

/** DNS lookup that refuses non-public addresses; used by the connection itself. */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = Array.isArray(addresses) ? addresses : [];
    if (list.length === 0 || list.some((a) => !isPublicIp(a.address))) {
      return callback(new SafeFetchError("blocked-address"), "", 4);
    }
    const first = list[0];
    // Node asks with `all: true` when happy-eyeballs is on; answer in the shape it asked for.
    if ((options as { all?: boolean }).all) {
      (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    } else {
      callback(null, first.address, first.family);
    }
  });
};

export type SafeFetchOptions = {
  maxBytes: number;
  /** Allowed content types (exact matches, before any ";"). */
  accept: readonly string[];
  timeoutMs?: number;
  maxRedirects?: number;
  /** For tests only: skip the public-address rule (e.g. to fetch from a local test server). */
  allowPrivateForTests?: boolean;
};

export type SafeFetchResult = { url: string; contentType: string; body: Buffer };

function requestOnce(url: URL, opts: SafeFetchOptions, deadline: number) {
  return new Promise<{ status: number; location?: string; contentType: string; body: Buffer }>((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const remaining = Math.max(1, deadline - Date.now());
    const req = lib.request(
      url,
      {
        method: "GET",
        lookup: opts.allowPrivateForTests ? undefined : guardedLookup,
        headers: {
          "User-Agent": "PennyEffectBot/1.0 (link preview)",
          Accept: opts.accept.join(", "),
        },
        timeout: remaining,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, contentType, body: Buffer.alloc(0) });
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > opts.maxBytes) {
          res.destroy();
          return reject(new SafeFetchError("too-large"));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > opts.maxBytes) {
            res.destroy();
            reject(new SafeFetchError("too-large"));
          } else chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks) }));
        res.on("error", () => reject(new SafeFetchError("network")));
      },
    );
    req.on("timeout", () => req.destroy(new SafeFetchError("timeout")));
    req.on("error", (e) => reject(e instanceof SafeFetchError ? e : new SafeFetchError("network")));
    req.end();
  });
}

/** GETs a URL under the rules above. Throws SafeFetchError; never leaks the target's error text. */
export async function safeFetch(raw: string, opts: SafeFetchOptions): Promise<SafeFetchResult> {
  if (opts.allowPrivateForTests && process.env.NODE_ENV === "production") {
    throw new Error("allowPrivateForTests is for tests only");
  }
  const deadline = Date.now() + (opts.timeoutMs ?? 5000);
  let url = opts.allowPrivateForTests ? new URL(raw) : checkUrl(raw);
  for (let hop = 0; hop <= (opts.maxRedirects ?? 3); hop++) {
    if (Date.now() > deadline) throw new SafeFetchError("timeout");
    const res = await requestOnce(url, opts, deadline);
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new SafeFetchError("bad-status");
      const next = new URL(res.location, url).toString();
      url = opts.allowPrivateForTests ? new URL(next) : checkUrl(next);
      continue;
    }
    if (res.status !== 200) throw new SafeFetchError("bad-status");
    if (!opts.accept.includes(res.contentType)) throw new SafeFetchError("bad-type");
    return { url: url.toString(), contentType: res.contentType, body: res.body };
  }
  throw new SafeFetchError("too-many-redirects");
}
