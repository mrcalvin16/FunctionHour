import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("./monetizationPricing.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function("module", "exports", "require", js)(module, module.exports, require);
const { merchCommissionCents, quoteBoostCents } = module.exports;
const sample = { areaDemandIndex: .5, competingBoosts: 2, availableSlots: 5, daysUntilEvent: 10, durationDays: 7, placement: "featured" };
test("merchandise commission rounds to nearest cent", () => {
 assert.equal(merchCommissionCents(2500), 125);
 assert.equal(merchCommissionCents(199), 10);
 assert.equal(merchCommissionCents(0), 0);
});
test("rejects invalid merchandise subtotals", () => {
 for (const value of [-1, 1.5, NaN, Infinity]) assert.throws(() => merchCommissionCents(value));
});
test("boost quote rises with measured demand", () => {
 const low = quoteBoostCents({ ...sample, areaDemandIndex: 0 });
 const high = quoteBoostCents({ ...sample, areaDemandIndex: 1 });
 assert.ok(high.totalCents > low.totalCents);
});
test("boost quote rises with competition", () => {
 const low = quoteBoostCents({ ...sample, competingBoosts: 0 });
 const high = quoteBoostCents({ ...sample, competingBoosts: 12 });
 assert.ok(high.totalCents > low.totalCents);
});
test("boost quotes respect bounds", () => {
 assert.equal(quoteBoostCents({ ...sample, durationDays: 1, placement: "discovery", areaDemandIndex: 0 }).totalCents, 500);
 assert.ok(quoteBoostCents({ ...sample, durationDays: 30, placement: "spotlight", areaDemandIndex: 1, competingBoosts: 100 }).totalCents <= 50000);
});
test("invalid client-like signals rejected", () => {
 for (const patch of [{availableSlots:0},{areaDemandIndex:2},{durationDays:31},{competingBoosts:-1},{placement:"unknown"}]) {
   assert.throws(() => quoteBoostCents({ ...sample, ...patch }));
 }
});
