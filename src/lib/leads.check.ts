import assert from "node:assert";
import { buildOverpass, parseOverpass, resolveNiche } from "./leads.ts";

// resolveNiche
assert.deepEqual(resolveNiche("driving school"), ["amenity=driving_school", "shop=driving_school"]);
assert.deepEqual(resolveNiche(" RESTAURANT "), ["amenity=restaurant"]);
assert.deepEqual(resolveNiche("amenity=cafe, shop=beauty"), ["amenity=cafe", "shop=beauty"]);
assert.equal(resolveNiche("nonsense niche"), null);
assert.equal(resolveNiche('amenity="]""; out meta;'), null);
assert.equal(resolveNiche(""), null);

// buildOverpass
const q = buildOverpass(["amenity=cafe"], "1,2,3,4", 10);
assert.ok(q.includes('nwr["amenity"="cafe"](1,2,3,4);'));
assert.ok(q.includes("out body center 10;"));

// parseOverpass: skips nameless/positionless, extracts contacts, sorts by contact richness
const parsed = parseOverpass({
  elements: [
    { type: "node", lat: 1, lon: 2, tags: { name: "No contact" } },
    { type: "node", lat: 3, lon: 4, tags: { name: "Full", phone: "+92 300 1234567", website: "https://x.com", email: "a@b.c", "addr:street": "Main St", "addr:housenumber": "5", "addr:city": "Lahore" } },
    { type: "way", center: { lat: 5, lon: 6 }, tags: { name: "Partial", "contact:phone": "0300-1234567" } },
    { type: "node", lat: 7, lon: 8, tags: { amenity: "cafe" } },
    { type: "way", tags: { name: "No position" } },
  ],
});
assert.equal(parsed.length, 3);
assert.equal(parsed[0].name, "Full");
assert.equal(parsed[0].address, "5 Main St, Lahore");
assert.equal(parsed[0].whatsapp, "923001234567");
assert.equal(parsed[1].name, "Partial");
assert.equal(parsed[1].whatsapp, "03001234567");
assert.equal(parsed[1].website, "");
assert.equal(parsed[2].name, "No contact");

console.log("leads.check OK");
