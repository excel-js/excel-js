import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";

test("parse uncompressed archive", async () => {
  const archive = "./tests/fixtures/uncompressed/archive.zip";

  await new Promise((resolve, reject) => {
    const unzipParser = new Parse();

    fs.createReadStream(archive).pipe(unzipParser);

    unzipParser.on("error", reject);
    unzipParser.on("close", resolve);
  });
});
