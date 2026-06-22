import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";

await describe("deprecated", () => {
  it("Removed load method throws an exception", () => {
    assert.throws(() => new JSZip().load(""), /upgrade guide/);
  });

  it("Removed constructor with data throws an exception", () => {
    assert.throws(() => new JSZip(""), /upgrade guide/);
  });

  it("Removed asText method throws an exception", () => {
    const zip = new JSZip();
    zip.file("Hello.txt", "Hello World\n");
    assert.throws(() => zip.file("Hello.txt").asText(), /upgrade guide/);
  });

  it("Removed generate method throws an exception", () => {
    assert.throws(
      () => new JSZip().generate({ type: "string" }),
      /upgrade guide/,
    );
  });
});
