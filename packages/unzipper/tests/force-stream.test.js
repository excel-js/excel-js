import assert from "node:assert";
import fs from "node:fs";
import Stream from "node:stream";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

test("verify that setting the forceStream option emits a data event instead of entry", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  await new Promise((resolve, reject) => {
    let dataEventEmitted = false;
    let entryEventEmitted = false;

    fs.createReadStream(archive)
      .pipe(Parse({ forceStream: true }))
      .on("data", (entry) => {
        assert.strictEqual(entry instanceof Stream.PassThrough, true);
        dataEventEmitted = true;
      })
      .on("entry", () => {
        entryEventEmitted = true;
      })
      .on("finish", () => {
        assert.strictEqual(dataEventEmitted, true);
        assert.strictEqual(entryEventEmitted, false);
        resolve();
      })
      .on("error", reject);
  });
});
