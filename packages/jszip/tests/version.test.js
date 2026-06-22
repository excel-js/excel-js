import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";

await describe("version", () => {
  it("JSZip.version is correct", () => {
    assert.ok(JSZip.version);
    assert.ok(JSZip.version.match(/^\d+\.\d+\.\d+/));
  });
});
