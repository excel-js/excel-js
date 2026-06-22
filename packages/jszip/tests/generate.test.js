import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";
import {
  loadZipFile,
  createZipAll,
  similar,
  MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
  checkGenerateStability,
  checkBasicStreamBehavior,
  base64encode,
  toString,
} from "./helpers/test-utils.js";

async function testGenerate(options) {
  const zip = options.prepare();
  if (zip.generateInternalStream) {
    checkBasicStreamBehavior(zip.generateInternalStream(options.options)).catch(
      () => {},
    );
  }
  const promise = zip.generateAsync(options.options);
  zip.file(
    "Hello.txt",
    "updating the zip file after the call won't change the result",
  );
  try {
    const result = await promise;
    await options.assertions(null, result);
    if (!options.skipReloadTest) {
      await checkGenerateStability(result, options.options);
    }
  } catch (err) {
    await options.assertions(err, null);
  }
}

const streamCases = [
  { name: "no stream", file: "ref/all.zip", streamFiles: false },
  { name: "with stream", file: "ref/all-stream.zip", streamFiles: true },
];

await describe("generate", async () => {
  for (const { name: testName, file, streamFiles } of streamCases) {
    await describe("type:string. " + testName, () => {
      it("generates zip with type:string", async () => {
        const expected = loadZipFile(file);
        await testGenerate({
          prepare: createZipAll,
          options: { type: "binarystring", streamFiles },
          assertions(err, result) {
            assert.equal(err, null);
            assert.ok(
              similar(result, expected, 3 * MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY),
            );
          },
        });
      });
    });

    await describe("type:base64. " + testName, () => {
      it("generates zip with type:base64", async () => {
        await testGenerate({
          prepare() {
            const zip = new JSZip();
            zip.file("Hello.txt", "Hello World\n", {
              date: new Date(1234567891011),
            });
            zip.file("images", null, {
              dir: true,
              date: new Date(1234876591011),
            });
            zip.file(
              "images/smile.gif",
              "R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs=",
              { base64: true, date: new Date(1234123491011) },
            );
            return zip;
          },
          skipReloadTest: true,
          options: { type: "base64", streamFiles },
          async assertions(err, result) {
            assert.equal(err, null);
            assert.ok(typeof result === "string");
            assert.ok(result.length > 0);
            const roundtrip = await JSZip.loadAsync(
              Buffer.from(result, "base64"),
            );
            const content = await roundtrip.file("Hello.txt").async("string");
            assert.equal(content, "Hello World\n");
          },
        });
      });
    });

    await describe("type:uint8array. " + testName, () => {
      it("generates zip with type:uint8array", async () => {
        const expected = loadZipFile(file);
        await testGenerate({
          prepare: createZipAll,
          options: { type: "uint8array", streamFiles },
          assertions(err, result) {
            if (JSZip.support.uint8array) {
              assert.equal(err, null);
              assert.ok(result instanceof Uint8Array);
              assert.ok(
                similar(
                  result,
                  expected,
                  3 * MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
                ),
              );
            } else {
              assert.equal(result, null);
              assert.ok(err.message.match("not supported by this platform"));
            }
          },
        });
      });
    });

    await describe("type:arraybuffer. " + testName, () => {
      it("generates zip with type:arraybuffer", async () => {
        const expected = loadZipFile(file);
        await testGenerate({
          prepare: createZipAll,
          options: { type: "arraybuffer", streamFiles },
          assertions(err, result) {
            if (JSZip.support.arraybuffer) {
              assert.equal(err, null);
              assert.ok(result instanceof ArrayBuffer);
              assert.ok(
                similar(
                  result,
                  expected,
                  3 * MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
                ),
              );
            } else {
              assert.equal(result, null);
              assert.ok(err.message.match("not supported by this platform"));
            }
          },
        });
      });
    });

    await describe("type:nodebuffer. " + testName, () => {
      it("generates zip with type:nodebuffer", async () => {
        const expected = loadZipFile(file);
        await testGenerate({
          prepare: createZipAll,
          options: { type: "nodebuffer", streamFiles },
          assertions(err, result) {
            if (JSZip.support.nodebuffer) {
              assert.equal(err, null);
              assert.ok(result instanceof Buffer);
              const actual = toString(result);
              assert.ok(
                similar(
                  actual,
                  expected,
                  3 * MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
                ),
              );
            } else {
              assert.equal(result, null);
              assert.ok(err.message.match("not supported by this platform"));
            }
          },
        });
      });
    });

    await describe("type:blob. " + testName, () => {
      it("generates zip with type:blob", async () => {
        const expected = loadZipFile(file);
        await testGenerate({
          prepare: createZipAll,
          skipReloadTest: true,
          options: { type: "blob", streamFiles },
          assertions(err, result) {
            if (JSZip.support.blob) {
              assert.equal(err, null);
              assert.ok(result instanceof Blob);
              assert.equal(result.type, "application/zip");
              assert.equal(result.size, expected.length);
            } else {
              assert.equal(result, null);
              assert.ok(err.message.match("not supported by this platform"));
            }
          },
        });
      });
    });

    await describe("type:blob mimeType:application/ods. " + testName, () => {
      it("generates zip with type:blob and custom mimeType", async () => {
        const expected = loadZipFile(file);
        await testGenerate({
          prepare: createZipAll,
          skipReloadTest: true,
          options: { type: "blob", mimeType: "application/ods", streamFiles },
          assertions(err, result) {
            if (JSZip.support.blob) {
              assert.equal(err, null);
              assert.ok(result instanceof Blob);
              assert.equal(result.type, "application/ods");
              assert.equal(result.size, expected.length);
            } else {
              assert.equal(result, null);
              assert.ok(err.message.match("not supported by this platform"));
            }
          },
        });
      });
    });
  }

  const storeCases = [
    { name: "no stream", file: "ref/store.zip", streamFiles: false },
    { name: "with stream", file: "ref/store-stream.zip", streamFiles: true },
  ];

  for (const { name: testName, file, streamFiles } of storeCases) {
    it("STORE doesn't compress, " + testName, async () => {
      const expected = loadZipFile(file);
      await testGenerate({
        prepare() {
          const zip = new JSZip();
          zip.file(
            "Hello.txt",
            "This a looong file : we need to see the difference between the different compression methods.\n",
          );
          return zip;
        },
        options: { type: "binarystring", compression: "STORE", streamFiles },
        assertions(err, result) {
          assert.equal(err, null);
          assert.ok(
            similar(result, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY),
          );
        },
      });
    });
  }

  const deflateCases = [
    { name: "no stream", file: "ref/deflate.zip", streamFiles: false },
    { name: "with stream", file: "ref/deflate-stream.zip", streamFiles: true },
  ];

  for (const { name: testName, file, streamFiles } of deflateCases) {
    it("DEFLATE compress, " + testName, async () => {
      const expected = loadZipFile(file);
      await testGenerate({
        prepare() {
          const zip = new JSZip();
          zip.file(
            "Hello.txt",
            "This a looong file : we need to see the difference between the different compression methods.\n",
          );
          return zip;
        },
        options: { type: "binarystring", compression: "DEFLATE", streamFiles },
        assertions(err, result) {
          assert.equal(err, null);
          assert.ok(
            similar(result, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY),
          );
        },
      });
    });
  }

  it("STORE is the default method", async () => {
    const expected = loadZipFile("ref/text.zip");
    const zip = new JSZip();
    zip.file("Hello.txt", "Hello World\n");
    const content = await zip.generateAsync({
      type: "binarystring",
      compression: "STORE",
    });
    assert.ok(similar(content, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY));
  });

  it("Lazy decompression works", async () => {
    async function testLazyDecompression(from, to) {
      const actual = await createZipAll().generateAsync({
        type: "binarystring",
        compression: from,
      });
      const loaded = await JSZip.loadAsync(actual);
      await testGenerate({
        prepare() {
          return loaded;
        },
        skipReloadTest: true,
        options: { type: "binarystring", compression: to },
        assertions(err) {
          assert.equal(err, null, from + " -> " + to + " : no error");
        },
      });
    }

    await testLazyDecompression("STORE", "STORE");
    await testLazyDecompression("DEFLATE", "STORE");
    await testLazyDecompression("STORE", "DEFLATE");
    await testLazyDecompression("DEFLATE", "DEFLATE");
  });

  it("empty zip", async () => {
    const expected = loadZipFile("ref/empty.zip");
    await testGenerate({
      prepare() {
        return new JSZip();
      },
      options: { type: "binarystring" },
      assertions(err, result) {
        assert.equal(err, null);
        assert.ok(similar(result, expected, 0));
      },
    });
  });

  it("unknown compression throws an exception", async () => {
    await testGenerate({
      prepare: createZipAll,
      options: { type: "string", compression: "MAYBE" },
      assertions(err, result) {
        assert.equal(result, null);
        assert.ok(err.message.match("not a valid compression"));
      },
    });
  });

  it("missing type throws an exception", async () => {
    await testGenerate({
      prepare: createZipAll,
      options: {},
      assertions(err, result) {
        assert.equal(result, null);
        assert.ok(err.message.match("No output type specified."));
      },
    });
  });

  it("generateAsync uses the current folder level", async () => {
    const zip = new JSZip();
    zip.file("file1", "a");
    zip.folder("root1");
    zip.folder("root2").file("leaf1", "a");
    const loaded = await JSZip.loadAsync(
      await zip.folder("root2").generateAsync({ type: "string" }),
    );
    assert.ok(!loaded.file("file1"));
    assert.ok(!loaded.file("root1"));
    assert.ok(!loaded.file("root2"));
    assert.ok(loaded.file("leaf1"));
  });

  it("generateAsync keep the explicit / folder", async () => {
    const zip = new JSZip();
    zip.file("/file1", "a");
    zip.file("/root1/file2", "b");
    const loaded = await JSZip.loadAsync(
      await zip.generateAsync({ type: "string" }),
    );
    assert.ok(loaded.file("/file1"));
    assert.ok(loaded.file("/root1/file2"));
  });

  it("generate with promises as files", async () => {
    const expected = loadZipFile("ref/all.zip");
    const zip = new JSZip();
    zip.file(
      "Hello.txt",
      new JSZip.external.Promise((resolve) => {
        setTimeout(() => resolve("Hello World\n"), 50);
      }),
    );
    zip.folder("images").file(
      "smile.gif",
      new JSZip.external.Promise((resolve) => {
        setTimeout(
          () =>
            resolve("R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs="),
          100,
        );
      }),
      { base64: true },
    );

    const result = await zip.generateAsync({ type: "string" });
    assert.ok(
      similar(result, expected, 3 * MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY),
    );
  });
});
