import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";

function createZipAll() {
  const zip = new JSZip();
  zip.file("Hello.txt", "Hello World\n");
  zip
    .folder("images")
    .file(
      "smile.gif",
      "R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs=",
      { base64: true },
    );
  return zip;
}

await describe("forEach", () => {
  it("forEach works on /", () => {
    const zip = createZipAll();
    let count = 0;
    const calls = [];

    assert.equal(zip.root, "");

    zip.forEach((path, elt) => {
      assert.equal(path, elt.name);
      count++;
      calls.push(path);
    });

    assert.equal(count, 3);
    assert.deepEqual(calls, ["Hello.txt", "images/", "images/smile.gif"]);
  });

  it("forEach works on a sub folder", () => {
    const zip = new JSZip();
    const sub = zip.folder("subfolder");
    sub.file("Hello.txt", "Hello World\n");
    sub
      .folder("images")
      .file(
        "smile.gif",
        "R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs=",
        { base64: true },
      );
    let count = 0;
    const calls = [];

    assert.ok(zip.file("subfolder/Hello.txt"));
    assert.equal(sub.root, "subfolder/");

    sub.forEach((path, elt) => {
      assert.equal(path, elt.name.substr("subfolder/".length));
      count++;
      calls.push(path);
    });

    assert.equal(count, 3);
    assert.deepEqual(calls, ["Hello.txt", "images/", "images/smile.gif"]);
  });
});
