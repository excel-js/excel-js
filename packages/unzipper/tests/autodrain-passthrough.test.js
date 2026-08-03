import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

test("verify that immediate autodrain does not unzip", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  await new Promise((resolve, reject) => {
    fs.createReadStream(archive)
      .pipe(Parse())
      .on("entry", (entry) => {
        entry.autodrain().on("finish", () => {
          assert.strictEqual(entry.__autodraining, true);
        });
      })
      .on("finish", resolve)
      .on("error", reject);
  });
});

test("verify that autodrain promise works", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  await new Promise((resolve, reject) => {
    fs.createReadStream(archive)
      .pipe(Parse())
      .on("entry", (entry) => {
        entry
          .autodrain()
          .promise()
          .then(() => {
            assert.strictEqual(entry.__autodraining, true);
          })
          .catch(reject);
      })
      .on("finish", resolve)
      .on("error", reject);
  });
});

test("verify that autodrain resolves after it has finished", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  await new Promise((resolve, reject) => {
    fs.createReadStream(archive)
      .pipe(Parse())
      .on("entry", (entry) => entry.autodrain())
      .on("finish", resolve)
      .on("end", resolve)
      .on("error", reject);
  });
});
