import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";

await describe("filter", () => {
  it("Filtering a zip", () => {
    const zip = new JSZip();
    zip.file("1.txt", "1\n");
    zip.file("2.txt", "2\n");
    zip.file("3.log", "3\n");
    const result = zip.filter(
      (relativeFilename) => relativeFilename.indexOf(".txt") !== -1,
    );
    assert.equal(result.length, 2);
    assert.ok(result[0].name.indexOf(".txt") !== -1);
    assert.ok(result[1].name.indexOf(".txt") !== -1);
  });

  it("Filtering a zip from a relative path", () => {
    const zip = new JSZip();
    zip.file("foo/1.txt", "1\n");
    zip.file("foo/2.txt", "2\n");
    zip.file("foo/3.log", "3\n");
    zip.file("1.txt", "1\n");
    zip.file("2.txt", "2\n");
    zip.file("3.log", "3\n");

    let count = 0;
    const result = zip.folder("foo").filter((relativeFilename) => {
      count++;
      return relativeFilename.indexOf("3") !== -1;
    });
    assert.equal(count, 3);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "foo/3.log");
  });

  it("Filtering a zip : the full path is still accessible", () => {
    const zip = new JSZip();
    zip.file("foo/1.txt", "1\n");
    zip.file("foo/2.txt", "2\n");
    zip.file("foo/3.log", "3\n");
    zip.file("1.txt", "1\n");
    zip.file("2.txt", "2\n");
    zip.file("3.log", "3\n");

    const result = zip
      .folder("foo")
      .filter((relativeFilename, file) => file.name.indexOf("3") !== -1);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "foo/3.log");
  });
});
