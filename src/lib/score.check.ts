import assert from "node:assert";
import { scoreLead, extractLinks, classifyLinkError, inspect } from "./score.ts";
import type { Lead } from "./leads.ts";

const lead = (website: string): Lead => ({
  name: "Test Cafe", address: "", phone: "", whatsapp: "", website, email: "", lat: 0, lon: 0,
});

// no website → certain gaps, high opportunity
const noSite = scoreLead(lead(""), null);
assert.equal(noSite.total, 85);
assert.equal(noSite.verdict, "High opportunity");
assert.equal(noSite.partial, false);

// modern https site with booking + form → only "relevant industry"
const modern = "<html><meta name=viewport><form action=/book>book an appointment</form></html>";
const good = scoreLead(lead("https://x.com"), modern);
assert.equal(good.total, 20);
assert.equal(good.verdict, "Low opportunity");

// old http site, no viewport/form/booking → every row fires
const bad = scoreLead(lead("http://x.com"), "<html><font>hi</font></html>");
assert.equal(bad.total, 100);
assert.deepEqual(
  bad.rows.map((r) => r.label),
  ["Outdated website", "Poor mobile performance", "No booking system", "No enquiry form", "No SSL", "Relevant industry"],
);

// fetch failed → only URL-level facts, flagged partial
const down = scoreLead(lead("http://x.com"), null);
assert.equal(down.total, 30);
assert.equal(down.partial, true);

// bloated https site with viewport still scores mobile-poor
const fat = scoreLead(lead("https://x.com"), `<meta name=viewport>${"x".repeat(150_001)}`);
assert.equal(fat.total, 20 + 15 + 20 + 15);
assert.equal(fat.partial, false);

// ——— extractLinks: deduped, fragments/mailto dropped, same-site first, capped at 10 ———
const many = Array.from({ length: 12 }, (_, i) => `<a href="/p${i}">x</a>`).join("");
const links = extractLinks(many + '<a href="/dup">d</a><a href="/dup">d</a><a href="#top">t</a><a href="mailto:a@b.c">m</a>', "https://site.com/about");
assert.deepEqual(links.slice(0, 2), ["https://site.com/p0", "https://site.com/p1"]);
assert.equal(links.length, 10);
assert.ok(!links.includes("mailto:a@b.c") && links.every((u) => !u.includes("#")));
assert.deepEqual(extractLinks('<a href="https://other.com/x">o</a><a href="/local">l</a>', "https://site.com"), [
  "https://site.com/local",
  "https://other.com/x",
]);

// ——— classifyLinkError: definite dead = broken, everything else stays unknown ———
assert.equal(classifyLinkError(new Error("HTTP 404")), "fail");
assert.equal(classifyLinkError(new Error("HTTP 410")), "fail");
assert.equal(classifyLinkError(new Error("getaddrinfo ENOTFOUND x")), "fail");
assert.equal(classifyLinkError(new Error("timeout")), "unknown");
assert.equal(classifyLinkError(new Error("HTTP 403")), "unknown");
assert.equal(classifyLinkError(new Error("HTTP 500")), "unknown");

// ——— inspect ———
const statuses = (cs: ReturnType<typeof inspect>) => cs.map((c) => `${c.label}:${c.status}`);

// no website → single fail with the full-build pitch
const noSiteChecks = inspect(lead(""), null);
assert.equal(noSiteChecks.length, 1);
assert.equal(noSiteChecks[0].status, "fail");
assert.ok(noSiteChecks[0].service?.includes("website design"));

// clean https site → all six pass
const clean = inspect(lead("https://x.com"), modern, { loadMs: 800, links: [{ url: "https://x.com/a", status: "pass" }] });
assert.deepEqual(statuses(clean), [
  "Mobile responsiveness:pass", "Website loading speed:pass", "Broken links:pass",
  "SSL certificate:pass", "Contact form:pass", "Booking functionality:pass",
]);

// old slow http site with a dead link → every row fails with a service attached
const sick = inspect(lead("http://x.com"), "<html><font>hi</font></html>", {
  loadMs: 5200,
  links: [{ url: "https://x.com/a", status: "fail" }, { url: "https://x.com/b", status: "pass" }],
});
assert.deepEqual(statuses(sick), [
  "Mobile responsiveness:fail", "Website loading speed:fail", "Broken links:fail",
  "SSL certificate:fail", "Contact form:fail", "Booking functionality:fail",
]);
assert.ok(sick.every((c) => c.problem && c.service));
assert.ok(sick[1].problem?.includes("5.2s"));
assert.ok(sick[2].problem?.includes("1 of 2"));

// unreachable site → content checks unknown, SSL still decided from the URL
const downHttp = inspect(lead("http://x.com"), null, { fetchError: "timeout" });
assert.equal(downHttp.find((c) => c.label === "SSL certificate")?.status, "fail");
assert.equal(downHttp.filter((c) => c.status === "unknown").length, 5);
const downHttps = inspect(lead("https://x.com"), null, { fetchError: "timeout" });
assert.equal(downHttps.find((c) => c.label === "SSL certificate")?.status, "unknown");
const badCert = inspect(lead("https://x.com"), null, { fetchError: "certificate has expired" });
assert.equal(badCert.find((c) => c.label === "SSL certificate")?.status, "fail");

// link row: all-timed-out checks are unknown, zero links is a pass
assert.equal(inspect(lead("https://x.com"), modern, { loadMs: 500, links: [{ url: "x", status: "unknown" }] }).find((c) => c.label === "Broken links")?.status, "unknown");
assert.equal(inspect(lead("https://x.com"), modern, { loadMs: 500 }).find((c) => c.label === "Broken links")?.status, "pass");

console.log("score.check OK");
