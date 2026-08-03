import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

test("promise should resolve when entries have been processed", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";
  let entryRead = false;

  // Track async entry buffer processing so we can wait for it
  const entryPromises = [];

  const parserStream = fs.createReadStream(archive).pipe(new Parse());

  parserStream.on("entry", (entry) => {
    if (entry.path !== "file.txt") return entry.autodrain();

    const bufferPromise = entry.buffer().then(() => {
      entryRead = true;
    });
    entryPromises.push(bufferPromise);
  });

  // Wait for stream parsing to complete
  await parserStream.promise();

  // Ensure background asynchronous buffer operations are also complete
  await Promise.all(entryPromises);

  assert.strictEqual(entryRead, true);
});

test("promise should be rejected if there is an error in the stream", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  const parserStream = fs.createReadStream(archive).pipe(new Parse());

  parserStream.on("entry", function () {
    this.emit("error", new Error("this is an error"));
  });

  try {
    await parserStream.promise();
    assert.fail("This promise should be rejected");
  } catch (e) {
    assert.strictEqual(e.message, "this is an error");
  }
});
