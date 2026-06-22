import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";

await describe("constructor", () => {
  it("JSZip exists", () => {
    assert.ok(JSZip);
  });

  it("new JSZip()", () => {
    const zip = new JSZip();
    assert.ok(zip instanceof JSZip);
  });

  it("JSZip()", () => {
    const zip = JSZip();
    assert.ok(zip instanceof JSZip);
  });
});
