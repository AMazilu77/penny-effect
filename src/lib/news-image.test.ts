import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newsImageErrors, parseOgImage, sourceSite } from "@/lib/news-image";
import { checkUrl, isPublicIp, safeFetch, SafeFetchError } from "@/lib/safe-fetch";

describe("parseOgImage", () => {
  const page = "https://www.example.org/news/story";

  it("reads og:image in either attribute order and quote style, resolving relative links", () => {
    expect(parseOgImage(`<meta property="og:image" content="https://cdn.example.org/a.jpg">`, page)).toBe(
      "https://cdn.example.org/a.jpg",
    );
    expect(parseOgImage(`<meta content='/img/b.png' property='og:image' />`, page)).toBe("https://www.example.org/img/b.png");
  });

  it("falls back to twitter:image and decodes entities", () => {
    expect(parseOgImage(`<meta name="twitter:image" content="https://x.org/c.jpg?a=1&amp;b=2">`, page)).toBe(
      "https://x.org/c.jpg?a=1&b=2",
    );
  });

  it("ignores non-web links and pages without an image", () => {
    expect(parseOgImage(`<meta property="og:image" content="javascript:alert(1)">`, page)).toBeNull();
    expect(parseOgImage(`<meta property="og:image" content="data:image/png;base64,AAAA">`, page)).toBeNull();
    expect(parseOgImage(`<html><head><title>x</title></head></html>`, page)).toBeNull();
  });
});

describe("sourceSite", () => {
  it("gives the bare site name for the credit line", () => {
    expect(sourceSite("https://www.seti.org/news/x")).toBe("seti.org");
    expect(sourceSite("not a url")).toBeNull();
  });
});

describe("newsImageErrors", () => {
  it("accepts no image at all, or an image with a description", () => {
    expect(newsImageErrors({ imageUrl: "", imageAlt: "" })).toEqual({});
    expect(newsImageErrors({ imageUrl: "https://x.org/a.jpg", imageAlt: "Bed nets stacked in a warehouse" })).toEqual({});
  });

  it("requires alt text whenever there is an image", () => {
    expect(newsImageErrors({ imageUrl: "https://x.org/a.jpg", imageAlt: " " }).imageAlt).toMatch(/required/);
    expect(newsImageErrors({ imageUrl: "https://x.org/a.jpg", imageAlt: "pic" }).imageAlt).toMatch(/too short: 3/);
  });

  it("rejects non-web image links and a description without an image", () => {
    expect(newsImageErrors({ imageUrl: "ftp://x.org/a.jpg", imageAlt: "A real description" }).imageUrl).toMatch(/https/);
    expect(newsImageErrors({ imageUrl: "", imageAlt: "A real description" }).imageUrl).toMatch(/add an image link/);
  });
});

describe("isPublicIp", () => {
  it("refuses private, loopback, link-local, metadata and reserved addresses", () => {
    for (const ip of [
      "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
      "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "192.0.2.5",
      "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "2001:db8::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
    ]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it("allows ordinary public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPublicIp(ip), ip).toBe(true);
    }
  });

  it("rejects things that aren't IP addresses", () => {
    expect(isPublicIp("example.org")).toBe(false);
  });
});

describe("checkUrl", () => {
  it("allows plain http(s) URLs", () => {
    expect(checkUrl("https://example.org/a").hostname).toBe("example.org");
  });

  it("refuses other schemes, credentials, odd ports and literal private IPs", () => {
    for (const u of [
      "file:///etc/passwd", "ftp://example.org/", "https://user:pw@example.org/", "https://example.org:8080/",
      "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data/", "not a url",
    ]) {
      expect(() => checkUrl(u), u).toThrow(SafeFetchError);
    }
  });
});

describe("safeFetch", () => {
  let server: http.Server;
  let base: string;
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/page") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(`<meta property="og:image" content="/img.png">`);
      }
      if (req.url === "/big") {
        res.writeHead(200, { "Content-Type": "image/png" });
        return res.end(Buffer.alloc(2048));
      }
      if (req.url === "/svg") {
        res.writeHead(200, { "Content-Type": "image/svg+xml" });
        return res.end("<svg/>");
      }
      if (req.url === "/loop") {
        res.writeHead(302, { Location: "/loop" });
        return res.end();
      }
      if (req.url === "/to-page") {
        res.writeHead(301, { Location: "/page" });
        return res.end();
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("refuses to fetch from this machine (the real rule, no test override)", async () => {
    await expect(safeFetch(`${base}/page`, { maxBytes: 1000, accept: ["text/html"] })).rejects.toThrow(SafeFetchError);
    await expect(safeFetch("http://localhost/page", { maxBytes: 1000, accept: ["text/html"] })).rejects.toMatchObject({
      reason: expect.stringMatching(/blocked-address|bad-url/),
    });
  });

  // The remaining tests use the test-only override to reach the local server.
  const t = { allowPrivateForTests: true } as const;

  it("follows a redirect and returns the body", async () => {
    const r = await safeFetch(`${base}/to-page`, { ...t, maxBytes: 1000, accept: ["text/html"] });
    expect(r.url).toBe(`${base}/page`);
    expect(r.body.toString()).toContain("og:image");
  });

  it("enforces the size limit, the content types and the redirect limit", async () => {
    await expect(safeFetch(`${base}/big`, { ...t, maxBytes: 1024, accept: ["image/png"] })).rejects.toMatchObject({ reason: "too-large" });
    await expect(safeFetch(`${base}/svg`, { ...t, maxBytes: 1024, accept: ["image/png"] })).rejects.toMatchObject({ reason: "bad-type" });
    await expect(safeFetch(`${base}/loop`, { ...t, maxBytes: 1024, accept: ["text/html"] })).rejects.toMatchObject({
      reason: "too-many-redirects",
    });
    await expect(safeFetch(`${base}/missing`, { ...t, maxBytes: 1024, accept: ["text/html"] })).rejects.toMatchObject({
      reason: "bad-status",
    });
  });
});
