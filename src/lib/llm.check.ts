import assert from "node:assert";
import { parseOutreach } from "./llm.ts";

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

console.log("llm.check OK");
