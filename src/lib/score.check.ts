import assert from "node:assert";
import { scoreLead } from "./score.ts";
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

console.log("score.check OK");
