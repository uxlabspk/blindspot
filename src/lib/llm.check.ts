import assert from "node:assert";
import { parseOutreach, messagesPrompt } from "./llm.ts";
import type { Lead } from "./leads.ts";

const lead = (name: string): Lead => ({
  name, address: "1 Main St", phone: "1", whatsapp: "", website: "http://x.com", email: "a@b.c", lat: 0, lon: 0,
});

const draft = (o: Record<string, string>) => JSON.stringify(o);

// plain JSON
assert.deepEqual(
  parseOutreach(draft({ whatsapp_message: "hi", email_subject: "s", email_body: "body" })),
  { whatsapp: "hi", subject: "s", email: "body" },
);

// fenced JSON with surrounding chatter (llama.cpp models do this constantly)
assert.deepEqual(
  parseOutreach(
    `Sure!\n\`\`\`json\n${draft({ whatsapp_message: "hey", email_subject: "sub", email_body: "text" })}\n\`\`\`\n`,
  ),
  { whatsapp: "hey", subject: "sub", email: "text" },
);

// trailing comma before the closing brace (models do this constantly)
assert.deepEqual(
  parseOutreach('{"whatsapp_message":"hi","email_subject":"s","email_body":"body",}'),
  { whatsapp: "hi", subject: "s", email: "body" },
);

// a model echoing the lead back (same keys as the lead: whatsapp/email) must fail loudly
assert.throws(
  () => parseOutreach('{"whatsapp":"923001234567","email":"hi@bun.pk","subject":"x"}'),
  /incomplete draft/,
);
assert.throws(() => parseOutreach('{"whatsapp_message":"hi"}'), /incomplete draft/);
assert.throws(() => parseOutreach("not json at all"), /unparseable draft/);
assert.throws(() => parseOutreach(""), /unparseable draft/);

// ——— messagesPrompt: three sections, observations grounded, contact details withheld ———
const mp = messagesPrompt(lead("Khan Driving School"), ["No online booking or appointment flow found.", "No contact form anywhere on the page."]);
assert.ok(mp.system.includes("### EMAIL") && mp.system.includes("### LINKEDIN") && mp.system.includes("### INTRO"));
assert.ok(/never invent/i.test(mp.system), "system prompt must forbid inventing problems");
// plain labeled data (local models mishandle JSON blobs), name first and repeated at the end
assert.ok(mp.user.startsWith("Business name: Khan Driving School"));
assert.ok(mp.user.includes("- No online booking or appointment flow found."));
assert.ok(mp.user.includes("- No contact form anywhere on the page."));
// placeholder + point-of-view guards (a weak model wrote "Hello [Business Name]" once)
assert.ok(/placeholder/i.test(mp.system) && /never as the business/i.test(mp.system));
assert.ok(mp.user.includes('Write TO "Khan Driving School"') && mp.user.includes("never use placeholders"));
// phone/email never reach the prompt (the model would echo them back); address is context
assert.ok(!mp.user.includes("a@b.c") && !mp.user.includes('"phone"'));

// no verified problems → prompt says so explicitly instead of letting the model invent one
const none = messagesPrompt(lead("Clean Cafe"), []);
assert.ok(none.user.includes("None recorded"));
assert.ok(/do not cite any problem/i.test(none.user));

console.log("llm.check OK");
