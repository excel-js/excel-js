import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

test("parse archive w/ file size unknown flag set (created by OS X Finder)", async () => {
  const archive = "./tests/fixtures/compressed-OSX-Finder/archive.zip";

  await new Promise((resolve, reject) => {
    const unzipParser = new Parse();

    fs.createReadStream(archive).pipe(unzipParser);

    unzipParser.on("error", reject);
    unzipParser.on("close", resolve);
  });
});
