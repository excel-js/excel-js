import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";
import * as streamBuffers from "nano-stream-buffers";

test("pipe a single file entry out of a zip", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  await new Promise((resolve, reject) => {
    fs.createReadStream(archive)
      .pipe(new Parse())
      .on("entry", (entry) => {
        if (entry.path === "file.txt") {
          const writableStream = new streamBuffers.WritableStreamBuffer();

          writableStream.on("close", () => {
            try {
              const str = writableStream.getContentsAsString("utf8");
              const fileStr = fs.readFileSync(
                "./tests/fixtures/compressed-standard/inflated/file.txt",
                "utf8",
              );
              assert.strictEqual(str, fileStr);
              resolve();
            } catch (err) {
              reject(err);
            }
          });

          writableStream.on("error", reject);
          entry.pipe(writableStream);
        } else {
          entry.autodrain();
        }
      })
      .on("error", reject);
  });
});
