import { test } from "node:test";
import { strict as assert } from "node:assert";
import { answerSupportQuestion } from "./supportFaq.ts";

test("merch order routes to merch, not ticket order", () => {
  const answer = answerSupportQuestion("Where are my merch orders?");
  assert.equal(answer.links[0].href, "/my-merch-orders");
});

test("refund answer points to the actual policy and does not promise approval", () => {
  const answer = answerSupportQuestion("How do refunds work?");
  assert.equal(answer.links[0].href, "/refund-policy");
  assert.match(answer.text, /does not guarantee a refund/);
  assert.equal(answer.requestHelp, true);
});

test("event reports invite an Operations support request", () => {
  const answer = answerSupportQuestion("Report an unsafe event");
  assert.equal(answer.requestHelp, true);
  assert.match(answer.text, /report an event or organizer/);
});
