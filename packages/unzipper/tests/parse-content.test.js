import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

test("get content of a single file entry out of a zip", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  await new Promise((resolve, reject) => {
    fs.createReadStream(archive)
      .pipe(Parse())
      .on("entry", (entry) => {
        if (entry.path !== "file.txt") return entry.autodrain();

        entry
          .buffer()
          .then((str) => {
            const fileStr = fs.readFileSync(
              "./tests/fixtures/compressed-standard/inflated/file.txt",
              "utf8",
            );
            assert.strictEqual(str.toString(), fileStr);
            resolve();
          })
          .catch(reject);
      })
      .on("error", reject);
  });
});
