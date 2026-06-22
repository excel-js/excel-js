import assert from "node:assert";
import { describe, it } from "node:test";

await describe("utils", () => {
  describe.todo("Paths are resolved correctly", () => {
    it.skip("Paths are resolved correctly", () => {
      assert.strictEqual(utils.resolve("root\\a\\b"), "root\\a\\b");
      assert.strictEqual(utils.resolve("root/a/b"), "root/a/b");
      assert.strictEqual(utils.resolve("root/a/.."), "root");
      assert.strictEqual(utils.resolve("root/a/../b"), "root/b");
      assert.strictEqual(utils.resolve("root/a/./b"), "root/a/b");
      assert.strictEqual(utils.resolve("root/../../../"), "");
      assert.strictEqual(utils.resolve("////"), "/");
      assert.strictEqual(utils.resolve("/a/b/c"), "/a/b/c");
      assert.strictEqual(utils.resolve("a/b/c/"), "a/b/c/");
      assert.strictEqual(utils.resolve("../../../../../a"), "a");
      assert.strictEqual(utils.resolve("../app.js"), "app.js");
    });
  });
});
