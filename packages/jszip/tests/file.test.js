import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";
import {
  loadZipFile,
  similar,
  MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
  checkGenerateStability,
  checkBasicStreamBehavior,
  base64encode,
  toString,
} from "./helpers/test-utils.js";

function str2blob(str) {
  const u8 = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    u8[i] = str.charCodeAt(i);
  }
  return new Blob([u8.buffer], { type: "text/plain" });
}

await describe("file", async () => {
  await describe("add", () => {
    it("Zip text file !", async () => {
      const expected = loadZipFile("ref/text.zip");
      const zip = new JSZip();
      zip.file("Hello.txt", "Hello World\n");
      await checkBasicStreamBehavior(
        zip.generateInternalStream({ type: "binarystring" }),
      );
      const actual = await zip.generateAsync({ type: "binarystring" });
      assert.ok(similar(actual, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY));
      await checkGenerateStability(actual);
    });

    it("Zip text, folder and image", async () => {
      const expected = loadZipFile("ref/all.zip");
      const zip = new JSZip();
      zip.file("Hello.txt", "Hello World\n");
      zip
        .folder("images")
        .file(
          "smile.gif",
          "R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs=",
          { base64: true },
        );
      const actual = await zip.generateAsync({ type: "binarystring" });
      assert.ok(
        similar(actual, expected, 3 * MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY),
      );
      await checkGenerateStability(actual);
    });

    it("Add a file to overwrite", async () => {
      const expected = loadZipFile("ref/text.zip");
      const zip = new JSZip();
      zip.file("Hello.txt", "hello ?");
      zip.file("Hello.txt", "Hello World\n");
      const actual = await zip.generateAsync({ type: "binarystring" });
      assert.ok(similar(actual, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY));
      await checkGenerateStability(actual);
    });

    it("Zip text file with date", async () => {
      const expected = loadZipFile("ref/text.zip");
      const zip = new JSZip();
      zip.file("Hello.txt", "Hello World\n", {
        date: new Date("July 17, 2009 14:36:57"),
      });
      const actual = await zip.generateAsync({ type: "binarystring" });
      assert.ok(similar(actual, expected, 10));
      await checkGenerateStability(actual);
    });

    it("Zip image file", async () => {
      const expected = loadZipFile("ref/image.zip");
      const zip = new JSZip();
      zip.file(
        "smile.gif",
        "R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs=",
        { base64: true },
      );
      const actual = await zip.generateAsync({ type: "binarystring" });
      assert.ok(similar(actual, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY));
      await checkGenerateStability(actual);
    });

    it("add file: from XHR (with bytes > 255)", async () => {
      const textZip = loadZipFile("ref/text.zip");
      const zip = new JSZip();
      zip.file("text.zip", textZip, { binary: true });
      const actual = await zip.generateAsync({ type: "binarystring" });
      await checkGenerateStability(actual);
    });

    it("add file: wrong string as base64", async () => {
      const zip = new JSZip();
      zip.file("text.txt", "a random string", { base64: true });
      try {
        await zip.generateAsync({ type: "binarystring" });
        assert.ok(false, "generateAsync should fail");
      } catch (e) {
        assert.equal(e.message, "Invalid base64 input, bad content length.");
      }
    });

    it("add file: data url instead of base64", async () => {
      const zip = new JSZip();
      zip.file("text.txt", "data:image/png;base64,YmFzZTY0", { base64: true });
      try {
        await zip.generateAsync({ type: "binarystring" });
        assert.ok(false, "generateAsync should fail");
      } catch (e) {
        assert.equal(
          e.message,
          "Invalid base64 input, it looks like a data url.",
        );
      }
    });

    async function testFileDataGetters(opts) {
      if (typeof opts.rawData === "undefined") {
        opts.rawData = opts.textData;
      }
      const promises = [
        _actualTestFileDataGetters.testGetter(opts, "string"),
        _actualTestFileDataGetters.testGetter(opts, "text"),
        _actualTestFileDataGetters.testGetter(opts, "base64"),
        _actualTestFileDataGetters.testGetter(opts, "array"),
        _actualTestFileDataGetters.testGetter(opts, "binarystring"),
        _actualTestFileDataGetters.testGetter(opts, "arraybuffer"),
        _actualTestFileDataGetters.testGetter(opts, "uint8array"),
        _actualTestFileDataGetters.testGetter(opts, "nodebuffer"),
        _actualTestFileDataGetters.testGetter(opts, "blob"),
        _actualTestFileDataGetters.testGetter(opts, "unknown"),
        _actualTestFileDataGetters.testGetter(opts, null),
      ];

      const reloadedZip = await JSZip.loadAsync(
        await opts.zip.generateAsync({ type: "binarystring" }),
      );
      const reloaded = {
        name: "(reloaded) " + opts.name,
        zip: reloadedZip,
        textData: opts.textData,
        rawData: opts.rawData,
      };
      promises.push(
        _actualTestFileDataGetters.testGetter(reloaded, "string"),
        _actualTestFileDataGetters.testGetter(reloaded, "text"),
        _actualTestFileDataGetters.testGetter(reloaded, "base64"),
        _actualTestFileDataGetters.testGetter(reloaded, "array"),
        _actualTestFileDataGetters.testGetter(reloaded, "binarystring"),
        _actualTestFileDataGetters.testGetter(reloaded, "arraybuffer"),
        _actualTestFileDataGetters.testGetter(reloaded, "uint8array"),
        _actualTestFileDataGetters.testGetter(reloaded, "nodebuffer"),
        _actualTestFileDataGetters.testGetter(reloaded, "blob"),
        _actualTestFileDataGetters.testGetter(reloaded, "unknown"),
        _actualTestFileDataGetters.testGetter(reloaded, null),
      );

      opts.zip.file(
        "file.txt",
        "changing the content after the call won't change the result",
      );
      await Promise.all(promises);
    }

    const _actualTestFileDataGetters = {
      async testGetter(opts, askedType) {
        const asyncTestName =
          "[test = " +
          opts.name +
          "] [method = async(" +
          askedType +
          ") | internalStream(" +
          askedType +
          ")] ";

        try {
          const stream = opts.zip.file("file.txt").internalStream(askedType);
          checkBasicStreamBehavior(stream).catch(() => {});
        } catch {
          // internalStream can throw for unsupported types (unknown, null)
        }

        try {
          const result = await opts.zip.file("file.txt").async(askedType);
          this["assert_" + askedType](opts, null, result, asyncTestName);
        } catch (err) {
          this["assert_" + askedType](opts, err, null, asyncTestName);
        }
      },
      assert_string(opts, err, txt) {
        assert.equal(err, null);
        assert.equal(txt, opts.textData);
      },
      assert_text() {
        this.assert_string.apply(this, arguments);
      },
      assert_base64(opts, err, bin) {
        assert.equal(err, null);
        assert.equal(bin, base64encode(opts.rawData));
      },
      assert_binarystring(opts, err, bin) {
        assert.equal(err, null);
        assert.equal(bin, opts.rawData);
      },
      assert_array(opts, err, array) {
        assert.equal(err, null);
        assert.ok(array instanceof Array);
        const actual = toString(array);
        assert.equal(actual, opts.rawData);
      },
      assert_arraybuffer(opts, err, buffer) {
        if (JSZip.support.arraybuffer) {
          assert.equal(err, null);
          assert.ok(buffer instanceof ArrayBuffer);
          const actual = toString(buffer);
          assert.equal(actual, opts.rawData);
        } else {
          assert.equal(buffer, null);
          assert.ok(err.message.match("not supported by this platform"));
        }
      },
      assert_uint8array(opts, err, bufferView) {
        if (JSZip.support.uint8array) {
          assert.equal(err, null);
          assert.ok(bufferView instanceof Uint8Array);
          const actual = toString(bufferView);
          assert.equal(actual, opts.rawData);
        } else {
          assert.equal(bufferView, null);
          assert.ok(err.message.match("not supported by this platform"));
        }
      },
      assert_nodebuffer(opts, err, buffer) {
        if (JSZip.support.nodebuffer) {
          assert.equal(err, null);
          assert.ok(buffer instanceof Buffer);
          const actual = toString(buffer);
          assert.equal(actual, opts.rawData);
        } else {
          assert.equal(buffer, null);
          assert.ok(err.message.match("not supported by this platform"));
        }
      },
      assert_blob(opts, err, blob) {
        if (JSZip.support.blob) {
          assert.equal(err, null);
          assert.ok(blob instanceof Blob);
          assert.equal(blob.type, "");
          assert.equal(blob.size, opts.rawData.length);
        } else {
          assert.equal(blob, null);
          assert.ok(err.message.match("not supported by this platform"));
        }
      },
      assert_unknown(opts, err, buffer) {
        assert.equal(buffer, null);
        assert.ok(err.message.match("not supported by this platform"));
      },
      assert_null(opts, err, buffer) {
        assert.equal(buffer, null);
        assert.ok(err.message.match("No output type specified"));
      },
    };

    it("add file: file(name, undefined)", async () => {
      let zip = new JSZip();
      zip.file("file.txt", undefined);
      await testFileDataGetters({ name: "undefined", zip, textData: "" });

      zip = new JSZip();
      zip.file("file.txt", undefined, { binary: true });
      await testFileDataGetters({
        name: "undefined as binary",
        zip,
        textData: "",
      });

      zip = new JSZip();
      zip.file("file.txt", undefined, { base64: true });
      await testFileDataGetters({
        name: "undefined as base64",
        zip,
        textData: "",
      });
    });

    it("add file: file(name, null)", async () => {
      let zip = new JSZip();
      zip.file("file.txt", null);
      await testFileDataGetters({ name: "null", zip, textData: "" });

      zip = new JSZip();
      zip.file("file.txt", null, { binary: true });
      await testFileDataGetters({ name: "null as binary", zip, textData: "" });

      zip = new JSZip();
      zip.file("file.txt", null, { base64: true });
      await testFileDataGetters({ name: "null as base64", zip, textData: "" });
    });

    it("add file: file(name, stringAsText)", async () => {
      let zip = new JSZip();
      zip.file("file.txt", "\u20AC15\n", { binary: false });
      await testFileDataGetters({
        name: "utf8",
        zip,
        textData: "\u20AC15\n",
        rawData: "\xE2\x82\xAC15\n",
      });

      zip = new JSZip();
      zip.file("file.txt", "test\r\ntest\r\n", { binary: false });
      await testFileDataGetters({
        name: "\\r\\n",
        zip,
        textData: "test\r\ntest\r\n",
      });
    });

    it("add file: file(name, stringAsBinary)", async () => {
      let zip = new JSZip();
      zip.file("file.txt", "\xE2\x82\xAC15\n", { binary: true });
      await testFileDataGetters({
        name: "utf8",
        zip,
        textData: "\u20AC15\n",
        rawData: "\xE2\x82\xAC15\n",
      });

      zip = new JSZip();
      zip.file("file.txt", "test\r\ntest\r\n", { binary: true });
      await testFileDataGetters({
        name: "\\r\\n",
        zip,
        textData: "test\r\ntest\r\n",
      });
    });

    it("add file: file(name, array)", async () => {
      function toArray(str) {
        const array = new Array(str.length);
        for (let i = 0; i < str.length; i++) {
          array[i] = str.charCodeAt(i);
        }
        return array;
      }

      let zip = new JSZip();
      zip.file("file.txt", toArray("\xE2\x82\xAC15\n"), { binary: true });
      await testFileDataGetters({
        name: "utf8",
        zip,
        textData: "\u20AC15\n",
        rawData: "\xE2\x82\xAC15\n",
      });

      zip = new JSZip();
      zip.file("file.txt", toArray("test\r\ntest\r\n"), { binary: true });
      await testFileDataGetters({
        name: "\\r\\n",
        zip,
        textData: "test\r\ntest\r\n",
      });
    });

    it("add file: file(name, base64)", async () => {
      let zip = new JSZip();
      zip.file("file.txt", "4oKsMTUK", { base64: true });
      await testFileDataGetters({
        name: "utf8",
        zip,
        textData: "\u20AC15\n",
        rawData: "\xE2\x82\xAC15\n",
      });

      zip = new JSZip();
      zip.file("file.txt", "dGVzdA0KdGVzdA0K", { base64: true });
      await testFileDataGetters({
        name: "\\r\\n",
        zip,
        textData: "test\r\ntest\r\n",
      });
    });

    it("add file: file(name, unsupported)", async () => {
      const zip = new JSZip();
      zip.file("test.txt", new Date());
      try {
        await zip.file("test.txt").async("string");
        assert.ok(
          false,
          "An unsupported object was added, but no exception thrown",
        );
      } catch (e) {
        assert.ok(e.message.match("Is it in a supported JavaScript type"));
      }
    });

    if (JSZip.support.uint8array) {
      it("add file: file(name, Uint8Array)", async () => {
        const str2array = (str) => {
          const array = new Uint8Array(str.length);
          for (let i = 0; i < str.length; i++) {
            array[i] = str.charCodeAt(i);
          }
          return array;
        };
        let zip = new JSZip();
        zip.file("file.txt", str2array("\xE2\x82\xAC15\n"));
        await testFileDataGetters({
          name: "utf8",
          zip,
          textData: "\u20AC15\n",
          rawData: "\xE2\x82\xAC15\n",
        });

        zip = new JSZip();
        zip.file("file.txt", str2array("test\r\ntest\r\n"));
        await testFileDataGetters({
          name: "\\r\\n",
          zip,
          textData: "test\r\ntest\r\n",
        });

        zip = new JSZip();
        zip.file("file.txt", str2array(""));
        await testFileDataGetters({ name: "empty content", zip, textData: "" });
      });
    }

    if (JSZip.support.arraybuffer) {
      it("add file: file(name, ArrayBuffer)", async () => {
        const str2buffer = (str) => {
          const array = new Uint8Array(str.length);
          for (let i = 0; i < str.length; i++) {
            array[i] = str.charCodeAt(i);
          }
          return array.buffer;
        };
        let zip = new JSZip();
        zip.file("file.txt", str2buffer("\xE2\x82\xAC15\n"));
        await testFileDataGetters({
          name: "utf8",
          zip,
          textData: "\u20AC15\n",
          rawData: "\xE2\x82\xAC15\n",
        });

        zip = new JSZip();
        zip.file("file.txt", str2buffer("test\r\ntest\r\n"));
        await testFileDataGetters({
          name: "\\r\\n",
          zip,
          textData: "test\r\ntest\r\n",
        });

        zip = new JSZip();
        zip.file("file.txt", str2buffer(""));
        await testFileDataGetters({ name: "empty content", zip, textData: "" });
      });
    }

    it("add file: file(name, native Promise)", async () => {
      const str2promise = (str) =>
        new Promise((resolve) => setTimeout(() => resolve(str), 10));
      let zip = new JSZip();
      zip.file("file.txt", str2promise("\xE2\x82\xAC15\n"));
      await testFileDataGetters({
        name: "utf8",
        zip,
        textData: "\u20AC15\n",
        rawData: "\xE2\x82\xAC15\n",
      });

      zip = new JSZip();
      zip.file("file.txt", str2promise("test\r\ntest\r\n"));
      await testFileDataGetters({
        name: "\\r\\n",
        zip,
        textData: "test\r\ntest\r\n",
      });

      zip = new JSZip();
      zip.file("file.txt", str2promise(""));
      await testFileDataGetters({ name: "empty content", zip, textData: "" });
    });

    it("add file: file(name, polyfill Promise[string] as binary)", async () => {
      const str2promise = (str) =>
        new JSZip.external.Promise((resolve) =>
          setTimeout(() => resolve(str), 10),
        );
      const zip = new JSZip();
      zip.file("file.txt", str2promise("\xE2\x82\xAC15\n"), { binary: true });
      await testFileDataGetters({
        name: "utf8",
        zip,
        textData: "\u20AC15\n",
        rawData: "\xE2\x82\xAC15\n",
      });
    });

    it("add file: file(name, polyfill Promise[string] force text)", async () => {
      const str2promise = (str) =>
        new JSZip.external.Promise((resolve) =>
          setTimeout(() => resolve(str), 10),
        );
      const zip = new JSZip();
      zip.file("file.txt", str2promise("\u20AC15\n"), { binary: false });
      await testFileDataGetters({
        name: "utf8",
        zip,
        textData: "\u20AC15\n",
        rawData: "\xE2\x82\xAC15\n",
      });
    });

    if (JSZip.support.nodebuffer) {
      it("add file: file(name, Buffer)", async () => {
        const str2buffer = (str) => {
          const array = new Buffer(str.length);
          for (let i = 0; i < str.length; i++) {
            array[i] = str.charCodeAt(i);
          }
          return array;
        };
        let zip = new JSZip();
        zip.file("file.txt", str2buffer("\xE2\x82\xAC15\n"));
        await testFileDataGetters({
          name: "utf8",
          zip,
          textData: "\u20AC15\n",
          rawData: "\xE2\x82\xAC15\n",
        });

        zip = new JSZip();
        zip.file("file.txt", str2buffer("test\r\ntest\r\n"));
        await testFileDataGetters({
          name: "\\r\\n",
          zip,
          textData: "test\r\ntest\r\n",
        });

        zip = new JSZip();
        zip.file("file.txt", str2buffer(""));
        await testFileDataGetters({ name: "empty content", zip, textData: "" });
      });
    }
  });

  await describe("about folders", () => {
    it("Zip folder() shouldn't throw an exception", () => {
      const zip = new JSZip();
      try {
        zip.folder();
        assert.ok(true);
      } catch (e) {
        assert.ok(false, e.message || e);
      }
    });

    it("Zip empty folder", async () => {
      const expected = loadZipFile("ref/folder.zip");
      const zip = new JSZip();
      zip.folder("folder");
      const actual = await zip.generateAsync({ type: "binarystring" });
      assert.ok(similar(actual, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY));
      await checkGenerateStability(actual);
    });

    it("file() creates a folder with dir:true", () => {
      const zip = new JSZip();
      zip.file("folder", null, { dir: true });
      assert.ok(zip.files["folder/"].dir);
    });

    it("file() creates a folder with the right unix permissions", () => {
      const zip = new JSZip();
      zip.file("folder", null, { unixPermissions: parseInt("40500", 8) });
      assert.ok(zip.files["folder/"].dir);
    });

    it("file() creates a folder with the right dos permissions", () => {
      const zip = new JSZip();
      zip.file("folder", null, { dosPermissions: parseInt("010000", 2) });
      assert.ok(zip.files["folder/"].dir);
    });

    it("A folder stays a folder when created with file", async () => {
      const referenceDate = new Date("July 17, 2009 14:36:56");
      const referenceComment = "my comment";
      const zip = new JSZip();
      zip.file("folder", null, {
        dir: true,
        date: referenceDate,
        comment: referenceComment,
        unixPermissions: parseInt("40500", 8),
      });

      assert.ok(zip.files["folder/"].dir);
      assert.equal(
        zip.files["folder/"].date.getTime(),
        referenceDate.getTime(),
      );
      assert.equal(zip.files["folder/"].comment, referenceComment);
      assert.equal(zip.files["folder/"].unixPermissions.toString(8), "40500");

      const reloaded = await JSZip.loadAsync(
        await zip.generateAsync({ type: "string", platform: "UNIX" }),
      );
      assert.ok(reloaded.files["folder/"].dir);
      assert.equal(
        reloaded.files["folder/"].date.getTime(),
        referenceDate.getTime(),
      );
      assert.equal(reloaded.files["folder/"].comment, referenceComment);
      assert.equal(
        reloaded.files["folder/"].unixPermissions.toString(8),
        "40500",
      );
    });

    it("file() adds a slash for directories", () => {
      const zip = new JSZip();
      zip.file("folder_without_slash", null, { dir: true });
      zip.file("folder_with_slash/", null, { dir: true });
      assert.ok(zip.files["folder_without_slash/"]);
      assert.ok(zip.files["folder_with_slash/"]);
    });

    it("folder() doesn't overwrite existing entries", () => {
      const referenceComment = "my comment";
      const zip = new JSZip();
      zip.file("folder", null, {
        dir: true,
        comment: referenceComment,
        unixPermissions: parseInt("40500", 8),
      });

      zip.folder("folder");

      assert.equal(zip.files["folder/"].comment, referenceComment);
      assert.equal(zip.files["folder/"].unixPermissions.toString(8), "40500");
    });

    it("createFolders works on a file", () => {
      const zip = new JSZip();
      zip.file("false/0/1/2/file", "content", {
        createFolders: false,
        unixPermissions: "644",
      });
      zip.file("true/0/1/2/file", "content", {
        createFolders: true,
        unixPermissions: "644",
      });

      assert.ok(!zip.files["false/"]);
      assert.ok(zip.files["true/"]);
      assert.equal(zip.files["true/"].unixPermissions, null);
    });

    it("createFolders works on a folder", () => {
      const zip = new JSZip();
      zip.file("false/0/1/2/folder", null, {
        createFolders: false,
        unixPermissions: "777",
        dir: true,
      });
      zip.file("true/0/1/2/folder", null, {
        createFolders: true,
        unixPermissions: "777",
        dir: true,
      });

      assert.ok(!zip.files["false/"]);
      assert.ok(zip.files["true/"]);
      assert.equal(zip.files["true/"].unixPermissions, null);
    });

    it("folder follows the default createFolders settings", () => {
      const zip = new JSZip();
      zip.folder("true/0/1/2/folder");
      assert.ok(zip.files["true/"]);
    });

    it("A folder stays a folder", async () => {
      const zip = new JSZip();
      zip.folder("folder/");
      assert.ok(zip.files["folder/"].dir);

      const reloaded = await JSZip.loadAsync(
        await zip.generateAsync({ type: "binarystring" }),
      );
      assert.ok(reloaded.files["folder/"].dir);
    });

    it("Folders are created by default", () => {
      const zip = new JSZip();
      zip.file("test/Readme", "Hello World!\n");
      assert.ok(zip.files["test/Readme"]);
      assert.ok(zip.files["test/"]);
    });

    it("Folders can be avoided with createFolders", () => {
      const zip = new JSZip();
      zip.file("test/Readme", "Hello World!\n", { createFolders: false });
      assert.ok(zip.files["test/Readme"]);
      assert.ok(!zip.files["test/"]);
    });
  });

  await describe("find entries", () => {
    it("Finding a file", async () => {
      const zip = new JSZip();
      zip.file("Readme", "Hello World!\n");
      zip.file("Readme.French", "Bonjour tout le monde!\n");
      zip.file("Readme.Pirate", "Ahoy m'hearty!\n");

      const content = await zip.file("Readme.French").async("string");
      assert.equal(content, "Bonjour tout le monde!\n");
      assert.equal(zip.file("Readme.Deutsch"), null);
      assert.equal(zip.file(/Readme\../).length, 2);
      assert.equal(zip.file(/pirate/i).length, 1);
    });

    it("Finding a file (text search) with a relative folder", async () => {
      const zip = new JSZip();
      zip.folder("files/default").file("Readme", "Hello World!\n");
      zip
        .folder("files/translation")
        .file("Readme.French", "Bonjour tout le monde!\n");
      zip
        .folder("files")
        .folder("translation")
        .file("Readme.Pirate", "Ahoy m'hearty!\n");

      const content1 = await zip
        .file("files/translation/Readme.French")
        .async("string");
      assert.equal(content1, "Bonjour tout le monde!\n");

      const content2 = await zip
        .folder("files")
        .file("translation/Readme.French")
        .async("string");
      assert.equal(content2, "Bonjour tout le monde!\n");

      const content3 = await zip
        .folder("files/translation")
        .file("Readme.French")
        .async("string");
      assert.equal(content3, "Bonjour tout le monde!\n");
    });

    it("Finding files (regex) with a relative folder", () => {
      const zip = new JSZip();
      zip.folder("files/default").file("Readme", "Hello World!\n");
      zip
        .folder("files/translation")
        .file("Readme.French", "Bonjour tout le monde!\n");
      zip
        .folder("files")
        .folder("translation")
        .file("Readme.Pirate", "Ahoy m'hearty!\n");

      assert.equal(zip.file(/Readme/).length, 3);
      assert.equal(zip.folder("files/translation").file(/Readme/).length, 2);
      assert.equal(
        zip
          .folder("files")
          .folder("translation")
          .file(/Readme/).length,
        2,
      );
      assert.equal(zip.folder("files/translation").file(/pirate/i).length, 1);
      assert.equal(zip.folder("files/translation").file(/^readme/i).length, 2);
      assert.equal(zip.folder("files/default").file(/pirate/i).length, 0);
    });

    it("Finding folders", () => {
      const zip = new JSZip();
      zip.folder("root/").folder("sub1/");
      zip.folder("root/sub2/subsub1");

      assert.equal(zip.folder(/sub2\/$/).length, 1);
      assert.equal(zip.folder(/sub1/).length, 2);
      assert.equal(zip.folder(/root/).length, 4);
    });

    it("Finding folders with relative path", () => {
      const zip = new JSZip();
      zip.folder("root/").folder("sub1/");
      zip.folder("root/sub2/subsub1");
      const root = zip.folder("root/sub2");

      assert.equal(root.folder(/sub2\/$/).length, 0);
      assert.equal(root.folder(/sub1/).length, 1);
      assert.equal(root.folder(/^subsub1/).length, 1);
      assert.equal(root.folder(/root/).length, 0);
    });

    function zipObjectsAssertions(zipObject) {
      const date = new Date("July 17, 2009 14:36:57");

      assert.equal(zipObject.name, "Hello.txt");
      assert.equal(zipObject.comment, "my comment");
      const delta = Math.abs(zipObject.date.getTime() - date.getTime());
      assert.ok(delta < 2000);
    }

    it("ZipObject attributes", async () => {
      const date = new Date("July 17, 2009 14:36:57");
      const zip = new JSZip();
      zip.file("Hello.txt", "Hello World\n", { comment: "my comment", date });
      zipObjectsAssertions(zip.file("Hello.txt"));
      zipObjectsAssertions(zip.files["Hello.txt"]);
      const reloaded = await JSZip.loadAsync(
        await zip.generateAsync({ type: "binarystring" }),
      );
      zipObjectsAssertions(reloaded.file("Hello.txt"));
      zipObjectsAssertions(reloaded.files["Hello.txt"]);
    });

    it("generate uses updated ZipObject date attribute", async () => {
      const date = new Date("July 17, 2009 14:36:57");
      const zip = new JSZip();
      zip.file("Hello.txt", "Hello World\n", { comment: "my comment" });
      zip.files["Hello.txt"].date = date;
      const reloaded = await JSZip.loadAsync(
        await zip.generateAsync({ type: "binarystring" }),
      );
      zipObjectsAssertions(reloaded.file("Hello.txt"));
      zipObjectsAssertions(reloaded.files["Hello.txt"]);
    });
  });
});
