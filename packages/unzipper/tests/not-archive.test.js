import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

const archive = "./package.json";

test("parse a file that is not an archive", async () => {
  await new Promise((resolve, reject) => {
    const unzipParser = new Parse();

    fs.createReadStream(archive).pipe(unzipParser);

    unzipParser.on("error", (err) => {
      try {
        assert.ok(
          err.message.includes("invalid signature: 0x"),
          `Expected error message to contain "invalid signature: 0x", got: "${err.message}"`,
        );
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });

    unzipParser.on("close", (d) => {
      reject(new Error(`Archive was parsed when it should have failed: ${d}`));
    });
  });
});
