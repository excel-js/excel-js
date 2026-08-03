import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

test(
  "parse an archive that has a file that falls on a chunk boundary",
  { timeout: 2000 },
  async () => {
    const archive =
      "./tests/fixtures/chunk-boundary/chunk-boundary-archive.zip";

    await new Promise((resolve, reject) => {
      // Use an artificially low highWaterMark to make the edge case more likely to happen.
      fs.createReadStream(archive, { highWaterMark: 3 })
        .pipe(new Parse())
        .on("entry", (entry) => entry.autodrain())
        .on("finish", () => {
          assert.ok(true, "file complete");
          resolve();
        })
        .on("error", reject);
    });
  },
);
