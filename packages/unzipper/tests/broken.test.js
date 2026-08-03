import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

test("Parse a broken zipfile", async () => {
  const archive = "./tests/fixtures/compressed-standard/broken.zip";

  const parserStream = fs.createReadStream(archive).pipe(Parse());

  parserStream.on("entry", (entry) => {
    return entry.autodrain();
  });

  try {
    await parserStream.promise();
    assert.fail("Expected stream to reject, but it succeeded.");
  } catch (e) {
    assert.strictEqual(e.message, "FILE_ENDED");
  }
});
