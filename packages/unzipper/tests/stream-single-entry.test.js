import assert from "node:assert";
import fs from "node:fs";
import Stream from "node:stream";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";
import * as streamBuffers from "nano-stream-buffers";

test("pipe a single file entry out of a zip", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  await new Promise((resolve, reject) => {
    const receiver = new Stream.Transform({ objectMode: true });

    receiver._transform = function (entry, encoding, cb) {
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
            cb();
            resolve();
          } catch (err) {
            cb(err);
            reject(err);
          }
        });

        writableStream.on("error", (err) => {
          cb(err);
          reject(err);
        });

        entry.pipe(writableStream);
      } else {
        entry.autodrain();
        cb();
      }
    };

    receiver.on("error", reject);

    fs.createReadStream(archive)
      .pipe(Parse())
      .pipe(receiver)
      .on("error", reject);
  });
});
