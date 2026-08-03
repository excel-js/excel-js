import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

import { Parse } from "@excel.js/unzipper";
import il from "iconv-lite";

test("parse compressed archive (created by POSIX zip)", async () => {
  const archive = "./tests/fixtures/compressed-standard/archive.zip";

  await new Promise((resolve, reject) => {
    const unzipParser = Parse();

    fs.createReadStream(archive).pipe(unzipParser);

    unzipParser.on("error", reject);
    unzipParser.on("close", resolve);
    unzipParser.on("finish", resolve);
  });
});

test("parse compressed archive (created by DOS zip)", async () => {
  const archive = "./tests/fixtures/compressed-cp866/archive.zip";

  await new Promise((resolve, reject) => {
    const unzipParser = Parse();

    fs.createReadStream(archive).pipe(unzipParser);

    unzipParser.on("entry", (entry) => {
      try {
        const fileName = entry.props.flags.isUnicode
          ? entry.path
          : il.decode(entry.props.pathBuffer, "cp866");
        assert.strictEqual(fileName, "Тест.txt");
      } catch (err) {
        reject(err);
      }
    });

    unzipParser.on("error", reject);
    unzipParser.on("close", resolve);
    unzipParser.on("finish", resolve);
  });
});
