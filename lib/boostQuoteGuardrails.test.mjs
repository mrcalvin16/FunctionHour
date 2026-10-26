import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(path, deps = {}) {
 const src = readFileSync(new URL(path, import.meta.url), "utf8");
 const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 const module = { exports: {} };
 new Function("module", "exports", "require", js)(module, module.exports, (id) => deps[id] ?? require(id));
 return module.exports;
}
const pricing = load("./monetizationPricing.ts");
const { buildBoostQuote, assertBoostQuoteEligible } = load("./boostQuoteGuardrails.ts", { "./monetizationPricing": pricing });
const params = { eventId:"event_1", organizerId:"org_1", areaKey:"new-orleans-la", placement:"featured", durationDays:7, now:1000, market:{areaDemandIndex:.5,competingBoosts:3,availableSlots:5,daysUntilEvent:10} };
test("quote is bound to owner, event and expiry", () => {
 const q = buildBoostQuote(params);
 assert.equal(q.expiresAt, params.now + 15*60*1000);
 assert.doesNotThrow(() => assertBoostQuoteEligible(q,{eventId:"event_1",organizerId:"org_1",now:1001,expectedTotalCents:q.totalCents}));
 for (const override of [{eventId:"other"},{organizerId:"other"},{now:q.expiresAt},{expectedTotalCents:q.totalCents+1}])
  assert.throws(() => assertBoostQuoteEligible(q,{eventId:"event_1",organizerId:"org_1",now:1001,expectedTotalCents:q.totalCents,...override}));
});
test("invalid quote inputs fail closed", () => {
 assert.throws(() => buildBoostQuote({...params,eventId:" "}));
 assert.throws(() => buildBoostQuote({...params,now:NaN}));
 assert.throws(() => buildBoostQuote({...params,market:{...params.market,availableSlots:0}}));
});
