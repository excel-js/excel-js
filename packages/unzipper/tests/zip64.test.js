import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

const UNCOMPRESSED_SIZE = 5368709120;
const ZIP64_SIZE = 36;

test("Correct uncompressed size for zip64", async (t) => {
  const archive = "./tests/fixtures/big.zip";

  await t.test("in unzipper.parse", async () => {
    await new Promise((resolve, reject) => {
      fs.createReadStream(archive)
        .pipe(Parse())
        .on("entry", (entry) => {
          try {
            assert.strictEqual(
              entry.vars.uncompressedSize,
              UNCOMPRESSED_SIZE,
              "Parse: File header",
            );
            resolve();
          } catch (err) {
            reject(err);
          }
        })
        .on("error", reject);
    });
  });
});

test("Parse files from regular zip64 format correctly", async (t) => {
  const archive = "./tests/fixtures/zip64.zip";

  await t.test("in unzipper.parse", async () => {
    await new Promise((resolve, reject) => {
      fs.createReadStream(archive)
        .pipe(Parse())
        .on("entry", (entry) => {
          try {
            assert.strictEqual(
              entry.vars.uncompressedSize,
              ZIP64_SIZE,
              "Parse: File header",
            );
          } catch (err) {
            reject(err);
          }
        })
        .on("close", resolve)
        .on("finish", resolve)
        .on("error", reject);
    });
  });
});
