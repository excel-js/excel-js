import assert from "node:assert";
import { readFile, unlink } from "node:fs";
import { createWriteStream } from "node:fs";
import { describe, it } from "node:test";

import tmp from "tmp";

import JSZip from "../dist/index.cjs";
import {
  loadZipFile,
  createZipAll,
  similar,
  MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
  toString,
} from "./helpers/test-utils.js";

await describe("stream", async () => {
  await describe("internal", () => {
    it("A stream is pausable", async () => {
      const zip = new JSZip();
      const txt = "a text";
      for (let i = 0; i < 10; i++) {
        zip.file(i + ".txt", txt);
      }

      let allowChunks = true;
      let chunkCount = 0;

      await new Promise((resolve, reject) => {
        const helper = zip.generateInternalStream({
          streamFiles: true,
          type: "binarystring",
        });
        helper
          .on("data", () => {
            chunkCount++;
            assert.equal(allowChunks, true);
            if (chunkCount === 20) {
              allowChunks = false;
              helper.pause();
              setTimeout(() => {
                allowChunks = true;
                helper.resume();
              }, 50);
            }
          })
          .on("error", (e) => {
            reject(e);
          })
          .on("end", () => {
            resolve();
          });
        helper.resume();
      });
    });
  });

  await describe("nodejs", () => {
    function generateStreamTest(name, ref, createFunction, generateOptions) {
      it(name, async () => {
        const expected = loadZipFile(ref);
        const tempFile = tmp.tmpNameSync({ postfix: ".zip" });
        const zip = createFunction();

        await new Promise((resolve, reject) => {
          zip
            .generateNodeStream(generateOptions)
            .pipe(createWriteStream(tempFile))
            .on("close", () => {
              readFile(tempFile, (e, data) => {
                if (e) {
                  reject(e);
                  return;
                }
                const actual = toString(data);
                assert.ok(
                  similar(
                    actual,
                    expected,
                    3 * MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
                  ),
                );
                unlink(tempFile, (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
            })
            .on("error", (e) => {
              unlink(tempFile, () => reject(e));
            });
        });
      });
    }

    function zipObjectStreamTest(name, createFunction) {
      it(name, async () => {
        const tempFile = tmp.tmpNameSync({ postfix: ".txt" });
        await new Promise((resolve, reject) => {
          createFunction()
            .pipe(createWriteStream(tempFile))
            .on("close", () => {
              readFile(tempFile, (e, data) => {
                if (e) {
                  reject(e);
                  return;
                }
                const actual = toString(data);
                assert.equal(actual, "Hello World\n");
                unlink(tempFile, (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
            })
            .on("error", (e) => {
              unlink(tempFile, () => reject(e));
            });
        });
      });
    }

    generateStreamTest(
      "generateNodeStream(type:nodebuffer / !streamFiles) generates a working stream",
      "ref/all.zip",
      createZipAll,
      { type: "nodebuffer", streamFiles: false },
    );
    generateStreamTest(
      "generateNodeStream(type:<default> / !streamFiles) generates a working stream",
      "ref/all.zip",
      createZipAll,
      { streamFiles: false },
    );
    generateStreamTest(
      "generateNodeStream(<no options>) generates a working stream",
      "ref/all.zip",
      createZipAll,
    );
    generateStreamTest(
      "generateNodeStream(type:nodebuffer / streamFiles) generates a working stream",
      "ref/all-stream.zip",
      createZipAll,
      { type: "nodebuffer", streamFiles: true },
    );
    generateStreamTest(
      "generateNodeStream(type:<default> / streamFiles) generates a working stream",
      "ref/all-stream.zip",
      createZipAll,
      { streamFiles: true },
    );

    generateStreamTest(
      "generateNodeStream(type:nodebuffer / !streamFiles) generates a working stream from other streams",
      "ref/all.zip",
      () => {
        const helloStream = createZipAll().file("Hello.txt").nodeStream();
        const imgStream = createZipAll().file("images/smile.gif").nodeStream();
        const zip = new JSZip();
        zip.file("Hello.txt", helloStream);
        zip.folder("images").file("smile.gif", imgStream);
        return zip;
      },
      { type: "nodebuffer", streamFiles: false },
    );
    generateStreamTest(
      "generateNodeStream(type:nodebuffer / streamFiles) generates a working stream from other streams",
      "ref/all-stream.zip",
      () => {
        const helloStream = createZipAll().file("Hello.txt").nodeStream();
        const imgStream = createZipAll().file("images/smile.gif").nodeStream();
        const zip = new JSZip();
        zip.file("Hello.txt", helloStream);
        zip.folder("images").file("smile.gif", imgStream);
        return zip;
      },
      { type: "nodebuffer", streamFiles: true },
    );

    zipObjectStreamTest(
      "ZipObject#nodeStream generates a working stream[nodebuffer]",
      () => {
        return createZipAll().file("Hello.txt").nodeStream("nodebuffer");
      },
    );
    zipObjectStreamTest(
      "ZipObject#nodeStream generates a working stream[default]",
      () => {
        return createZipAll().file("Hello.txt").nodeStream();
      },
    );

    it("a ZipObject containing a stream can be read with async", async () => {
      const stream = createZipAll().file("Hello.txt").nodeStream();
      const zip = new JSZip();
      zip.file("Hello.txt", stream);
      const actual = await zip.file("Hello.txt").async("text");
      assert.equal(actual, "Hello World\n");
    });

    it("a ZipObject containing a stream can't be read with async 2 times", async () => {
      const stream = createZipAll().file("Hello.txt").nodeStream();
      const zip = new JSZip();
      zip.file("Hello.txt", stream);
      zip.file("Hello.txt").async("text");
      try {
        await zip.file("Hello.txt").async("text");
        assert.ok(false, "calling 2 times a stream should generate an error");
      } catch (e) {
        assert.ok(e.message.match("has already been used"));
      }
    });

    it("a ZipObject containing a stream can't be read with nodeStream 2 times", async () => {
      const stream = createZipAll().file("Hello.txt").nodeStream();
      const zip = new JSZip();
      zip.file("Hello.txt", stream);
      zip.file("Hello.txt").nodeStream().resume();
      await new Promise((resolve) => {
        zip
          .file("Hello.txt")
          .nodeStream()
          .on("error", (e) => {
            assert.ok(e.message.match("has already been used"));
            resolve();
          })
          .on("end", () => {
            assert.ok(
              false,
              "calling 2 times a stream should generate an error",
            );
            resolve();
          })
          .resume();
      });
    });

    it("generateAsync with a stream can't be read 2 times", async () => {
      const stream = createZipAll().file("Hello.txt").nodeStream();
      const zip = new JSZip();
      zip.file("Hello.txt", stream);
      zip.generateAsync({ type: "string" });
      try {
        await zip.generateAsync({ type: "string" });
        assert.ok(false, "calling 2 times a stream should generate an error");
      } catch (e) {
        assert.ok(e.message.match("has already been used"));
      }
    });

    it("generateNodeStream with a stream can't be read 2 times", async () => {
      const stream = createZipAll().file("Hello.txt").nodeStream();
      const zip = new JSZip();
      zip.file("Hello.txt", stream);
      zip.generateNodeStream().resume();
      await new Promise((resolve) => {
        zip
          .generateNodeStream()
          .on("error", (e) => {
            assert.ok(e.message.match("has already been used"));
            resolve();
          })
          .on("end", () => {
            assert.ok(
              false,
              "calling 2 times a stream should generate an error",
            );
            resolve();
          })
          .resume();
      });
    });

    it("loadAsync ends with an error when called with a stream", async () => {
      const stream = createZipAll().generateNodeStream({ type: "nodebuffer" });
      try {
        await JSZip.loadAsync(stream);
        assert.ok(false, "loading a zip file from a stream is impossible");
      } catch (e) {
        assert.ok(e.message.match("can't accept a stream when loading"));
      }
    });
  });
});
