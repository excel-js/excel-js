import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";
import {
  loadZipFile,
  similar,
  MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
  checkGenerateStability,
} from "./helpers/test-utils.js";

await describe("load", async () => {
  it("load(string) works", async () => {
    const file = loadZipFile("ref/all.zip");
    assert.ok(typeof file === "string");
    const zip = await JSZip.loadAsync(file);
    const result = await zip.file("Hello.txt").async("string");
    assert.equal(result, "Hello World\n");
  });

  it("Load files which shadow Object prototype methods", async () => {
    const file = loadZipFile("ref/pollution.zip");
    assert.ok(typeof file === "string");
    const zip = await JSZip.loadAsync(file);
    assert.notEqual(Object.getPrototypeOf(zip.files), zip.files.__proto__);
    const result = await zip.file("__proto__").async("string");
    assert.equal(result, "hello\n");
  });

  it("load(string) handles bytes > 255", async () => {
    const file = loadZipFile("ref/all.zip");
    let updatedFile = "";
    for (let i = 0; i < file.length; i++) {
      updatedFile += String.fromCharCode((file.charCodeAt(i) & 0xff) + 0x4200);
    }
    const zip = await JSZip.loadAsync(updatedFile);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("load(Array) works", async () => {
    const file = loadZipFile("ref/deflate.zip");
    const updatedFile = new Array(file.length);
    for (let i = 0; i < file.length; ++i) {
      updatedFile[i] = file.charCodeAt(i);
    }
    const zip = await JSZip.loadAsync(updatedFile);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(
      content,
      "This a looong file : we need to see the difference between the different compression methods.\n",
    );
  });

  it("load(array) handles bytes > 255", async () => {
    const file = loadZipFile("ref/deflate.zip");
    const updatedFile = new Array(file.length);
    for (let i = 0; i < file.length; ++i) {
      updatedFile[i] = file.charCodeAt(i) + 0x4200;
    }
    const zip = await JSZip.loadAsync(updatedFile);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(
      content,
      "This a looong file : we need to see the difference between the different compression methods.\n",
    );
  });

  if (JSZip.support.arraybuffer) {
    it("load(ArrayBuffer) works", async () => {
      const fileAsString = loadZipFile("ref/all.zip");
      const file = new ArrayBuffer(fileAsString.length);
      const bufferView = new Uint8Array(file);
      for (let i = 0; i < fileAsString.length; ++i) {
        bufferView[i] = fileAsString.charCodeAt(i);
      }
      assert.ok(file instanceof ArrayBuffer);

      const zip1 = await JSZip.loadAsync(file);
      const content1 = await zip1.file("Hello.txt").async("arraybuffer");
      assert.equal(content1.byteLength, 12);

      const zip2 = await JSZip.loadAsync(file);
      const content2 = await zip2.file("Hello.txt").async("uint8array");
      assert.equal(content2.buffer.byteLength, 12);

      const zip3 = await JSZip.loadAsync(file);
      const content3 = await zip3.file("Hello.txt").async("string");
      assert.equal(content3, "Hello World\n");
    });
  }

  if (JSZip.support.nodebuffer) {
    it("load(Buffer) works", async () => {
      const fileAsString = loadZipFile("ref/all.zip");
      const file = new Buffer(fileAsString.length);
      for (let i = 0; i < fileAsString.length; ++i) {
        file[i] = fileAsString.charCodeAt(i);
      }
      const zip = await JSZip.loadAsync(file);
      const content = await zip.file("Hello.txt").async("string");
      assert.equal(content, "Hello World\n");
    });
  }

  if (JSZip.support.uint8array) {
    it("load(Uint8Array) works", async () => {
      const fileAsString = loadZipFile("ref/all.zip");
      const file = new Uint8Array(fileAsString.length);
      for (let i = 0; i < fileAsString.length; ++i) {
        file[i] = fileAsString.charCodeAt(i);
      }
      assert.ok(file instanceof Uint8Array);

      const zip1 = await JSZip.loadAsync(file);
      const content1 = await zip1.file("Hello.txt").async("arraybuffer");
      assert.equal(content1.byteLength, 12);

      const zip2 = await JSZip.loadAsync(file);
      const content2 = await zip2.file("Hello.txt").async("uint8array");
      assert.equal(content2.buffer.byteLength, 12);

      const zip3 = await JSZip.loadAsync(file);
      const content3 = await zip3.file("Hello.txt").async("string");
      assert.equal(content3, "Hello World\n");
    });
  }

  it("zip with DEFLATE", async () => {
    const file = loadZipFile("ref/deflate.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(
      content,
      "This a looong file : we need to see the difference between the different compression methods.\n",
    );
  });

  it("read zip with comment", async () => {
    const file = loadZipFile("ref/archive_comment.zip");
    const zip = await JSZip.loadAsync(file);
    assert.equal(zip.comment, "file comment");
    assert.equal(zip.file("Hello.txt").comment, "entry comment");
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("generate zip with comment", async () => {
    const file = loadZipFile("ref/archive_comment.zip");
    const zip = new JSZip();
    zip.file("Hello.txt", "Hello World\n", { comment: "entry comment" });
    const generated = await zip.generateAsync({
      type: "binarystring",
      comment: "file comment",
    });
    assert.ok(similar(generated, file, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY));
    await checkGenerateStability(generated);
  });

  it("zip with extra attributes", async () => {
    const file = loadZipFile("ref/extra_attributes.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("zip 64", async () => {
    const file = loadZipFile("ref/zip64.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("zip with data descriptor", async () => {
    const file = loadZipFile("ref/data_descriptor.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("nested zip", async () => {
    const file = loadZipFile("ref/nested.zip");

    const zip1 = await JSZip.loadAsync(file);
    const innerZip = await JSZip.loadAsync(
      await zip1.file("zip_within_zip.zip").async("binarystring"),
    );
    const innerContent = await innerZip.file("Hello.txt").async("string");
    assert.equal(innerContent, "Hello World\n");

    const zip2 = await JSZip.loadAsync(file);
    const content = await zip2.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("nested zip with data descriptors", async () => {
    const file = loadZipFile("ref/nested_data_descriptor.zip");
    const zip = await JSZip.loadAsync(file);
    const innerZip = await JSZip.loadAsync(
      await zip.file("data_descriptor.zip").async("binarystring"),
    );
    const content = await innerZip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("nested zip 64", async () => {
    const file = loadZipFile("ref/nested_zip64.zip");
    const zip = await JSZip.loadAsync(file);
    const innerZip = await JSZip.loadAsync(
      await zip.file("zip64.zip").async("binarystring"),
    );
    const content = await innerZip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("Zip text file with UTF-8 characters in filename", async () => {
    const file = loadZipFile("ref/utf8_in_name.zip");
    const zip = await JSZip.loadAsync(file);
    assert.ok(zip.file("\u20AC15.txt") !== null);
    const content1 = await zip.file("\u20AC15.txt").async("string");
    assert.equal(content1, "\u20AC15\n");

    const content2 = await zip.files["\u20AC15.txt"].async("string");
    assert.equal(content2, "\u20AC15\n");
  });

  it("Zip text file with UTF-8 characters in filename and windows compatibility", async () => {
    const file = loadZipFile("ref/winrar_utf8_in_name.zip");
    const zip = await JSZip.loadAsync(file);
    assert.ok(zip.file("\u20AC15.txt") !== null);
    const content1 = await zip.file("\u20AC15.txt").async("string");
    assert.equal(content1, "\u20AC15\n");

    const content2 = await zip.files["\u20AC15.txt"].async("string");
    assert.equal(content2, "\u20AC15\n");
  });

  it("Zip text file with backslash in filename", async () => {
    const file = loadZipFile("ref/backslash.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hel\\lo.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("Zip text file from windows with \\ in central dir", async () => {
    const file = loadZipFile("ref/slashes_and_izarc.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.folder("test").file("Hello.txt").async("string");
    assert.equal(content, "Hello world\r\n");
  });

  it("zip file with prepended bytes", async () => {
    const file = loadZipFile("ref/all_prepended_bytes.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("zip file with appended bytes", async () => {
    const file = loadZipFile("ref/all_appended_bytes.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("zip64 file with extra bytes", async () => {
    const file = loadZipFile("ref/zip64_prepended_bytes.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("zip64 file with extra bytes", async () => {
    const file = loadZipFile("ref/zip64_appended_bytes.zip");
    const zip = await JSZip.loadAsync(file);
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("load(promise) works", async () => {
    const fileAsString = loadZipFile("ref/all.zip");
    const zip = await JSZip.loadAsync(
      JSZip.external.Promise.resolve(fileAsString),
    );
    const content = await zip.file("Hello.txt").async("string");
    assert.equal(content, "Hello World\n");
  });

  it("valid crc32", async () => {
    const file = loadZipFile("ref/all.zip");
    try {
      await JSZip.loadAsync(file, { checkCRC32: true });
      assert.ok(true);
    } catch (e) {
      assert.ok(false, "An exception were thrown: " + e.message);
    }
  });

  it("loading in a sub folder", async () => {
    const file = loadZipFile("ref/all.zip");
    const zip = new JSZip();
    const result = await zip.folder("sub").loadAsync(file);
    assert.ok(result.file("Hello.txt"));
    assert.equal(result.file("Hello.txt").name, "sub/Hello.txt");
    assert.equal(result.root, "sub/");
  });

  it("loading overwrite files", async () => {
    const file = loadZipFile("ref/all.zip");
    const zip = new JSZip();
    zip.file("Hello.txt", "bonjour \u00E0 tous");
    zip.file("Bye.txt", "au revoir");
    const result = await zip.loadAsync(file);
    const hello = await result.file("Hello.txt").async("text");
    const bye = await result.file("Bye.txt").async("text");
    assert.equal(hello, "Hello World\n");
    assert.equal(bye, "au revoir");
  });

  await describe("not supported features", () => {
    it("basic encryption", async () => {
      const file = loadZipFile("ref/encrypted.zip");
      try {
        await JSZip.loadAsync(file);
        assert.ok(
          false,
          "Encryption is not supported, but no exception were thrown",
        );
      } catch (e) {
        assert.equal(e.message, "Encrypted zip are not supported");
      }
    });
  });

  await describe("corrupted zip", () => {
    it("bad compression method", async () => {
      const file = loadZipFile("ref/invalid/compression.zip");
      try {
        await JSZip.loadAsync(file);
        assert.ok(false, "no exception were thrown");
      } catch (e) {
        assert.ok(e.message.match("Corrupted zip"));
      }
    });

    it("zip file with missing bytes", async () => {
      const file = loadZipFile("ref/all_missing_bytes.zip");
      try {
        await JSZip.loadAsync(file);
        assert.ok(false, "no exception were thrown");
      } catch (e) {
        assert.ok(e.message.match("Corrupted zip"));
      }
    });

    it("zip64 file with missing bytes", async () => {
      const file = loadZipFile("ref/zip64_missing_bytes.zip");
      try {
        await JSZip.loadAsync(file);
        assert.ok(false, "no exception were thrown");
      } catch (e) {
        assert.ok(e.message.match("Corrupted zip"));
      }
    });

    it("zip file with extra field is Non-standard", async () => {
      const file = loadZipFile("ref/extra_filed_non_standard.zip");
      try {
        await JSZip.loadAsync(file);
        assert.ok(true);
      } catch (e) {
        assert.ok(false, "An exception were thrown: " + e.message);
      }
    });

    it("not a zip file", async () => {
      try {
        await JSZip.loadAsync("this is not a zip file");
        assert.ok(false, "no exception were thrown");
      } catch (e) {
        assert.ok(e.message.match("stuk.github.io/jszip/documentation"));
      }
    });

    it("truncated zip file", async () => {
      try {
        await JSZip.loadAsync("PK\x03\x04\x0A\x00\x00\x00<cut>");
        assert.ok(false, "no exception were thrown");
      } catch (e) {
        assert.ok(e.message.match("Corrupted zip"));
      }
    });

    it("invalid crc32 but no check", async () => {
      const file = loadZipFile("ref/invalid/crc32.zip");
      try {
        await JSZip.loadAsync(file, { checkCRC32: false });
        assert.ok(true);
      } catch {
        assert.ok(
          false,
          "An exception were thrown but the check should have been disabled.",
        );
      }
    });

    it("invalid crc32", async () => {
      const file = loadZipFile("ref/invalid/crc32.zip");
      try {
        await JSZip.loadAsync(file, { checkCRC32: true });
        assert.ok(false, "no exception were thrown");
      } catch (e) {
        assert.ok(e.message.match("Corrupted zip"));
      }
    });

    it("bad offset", async () => {
      const file = loadZipFile("ref/invalid/bad_offset.zip");
      try {
        await JSZip.loadAsync(file, { checkCRC32: false });
        assert.ok(false, "no exception were thrown");
      } catch (e) {
        assert.ok(e.message.match("Corrupted zip"));
      }
    });

    it("bad decompressed size, read a file", async () => {
      const file = loadZipFile("ref/invalid/bad_decompressed_size.zip");
      try {
        const zip = await JSZip.loadAsync(file);
        await zip.file("Hello.txt").async("string");
        assert.ok(false, "successful result in an error test");
      } catch (e) {
        assert.ok(e.message.match("size mismatch"));
      }
    });

    it("bad decompressed size, generate a zip", async () => {
      const file = loadZipFile("ref/invalid/bad_decompressed_size.zip");
      try {
        const zip = await JSZip.loadAsync(file);
        zip.file("zz", "zz");
        await zip.generateAsync({ type: "string", compression: "DEFLATE" });
        assert.ok(false, "successful result in an error test");
      } catch (e) {
        assert.ok(e.message.match("size mismatch"));
      }
    });
  });

  await describe("complex files", () => {
    it("Franz Kafka - The Metamorphosis.epub", async () => {
      const file = loadZipFile(
        "ref/complex_files/Franz Kafka - The Metamorphosis.epub",
      );

      const zip1 = await JSZip.loadAsync(file);
      assert.equal(zip1.filter(() => true).length, 26);
      const content1 = await zip1.file("mimetype").async("string");
      assert.equal(content1, "application/epub+zip\r\n");

      const zip2 = await JSZip.loadAsync(file);
      const content2 = await zip2.file("OPS/main0.xml").async("string");
      assert.ok(
        content2.indexOf(
          "One morning, as Gregor Samsa was waking up from anxious dreams",
        ) !== -1,
      );
    });

    it("Outlook2007_Calendar.xps, createFolders: false", async () => {
      const file = loadZipFile("ref/complex_files/Outlook2007_Calendar.xps");
      const zip = await JSZip.loadAsync(file, { createFolders: false });
      assert.equal(zip.filter(() => true).length, 15);
      const content = await zip.file("[Content_Types].xml").async("string");
      assert.ok(
        content.indexOf("application/vnd.ms-package.xps-fixeddocument+xml") !==
          -1,
      );
    });

    it("Outlook2007_Calendar.xps, createFolders: true", async () => {
      const file = loadZipFile("ref/complex_files/Outlook2007_Calendar.xps");
      const zip = await JSZip.loadAsync(file, { createFolders: true });
      assert.equal(zip.filter(() => true).length, 23);
      const content = await zip.file("[Content_Types].xml").async("string");
      assert.ok(
        content.indexOf("application/vnd.ms-package.xps-fixeddocument+xml") !==
          -1,
      );
    });

    it("AntarcticaTemps.xlsx, createFolders: false", async () => {
      const file = loadZipFile("ref/complex_files/AntarcticaTemps.xlsx");
      const zip = await JSZip.loadAsync(file, { createFolders: false });
      assert.equal(zip.filter(() => true).length, 17);
      const content = await zip.file("[Content_Types].xml").async("string");
      assert.ok(
        content.indexOf(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
        ) !== -1,
      );
    });

    it("AntarcticaTemps.xlsx, createFolders: true", async () => {
      const file = loadZipFile("ref/complex_files/AntarcticaTemps.xlsx");
      const zip = await JSZip.loadAsync(file, { createFolders: true });
      assert.equal(zip.filter(() => true).length, 27);
      const content = await zip.file("[Content_Types].xml").async("string");
      assert.ok(
        content.indexOf(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
        ) !== -1,
      );
    });

    it("AntarcticaTemps.ods, createFolders: false", async () => {
      const file = loadZipFile("ref/complex_files/AntarcticaTemps.ods");
      const zip = await JSZip.loadAsync(file, { createFolders: false });
      assert.equal(zip.filter(() => true).length, 20);
      const content = await zip.file("META-INF/manifest.xml").async("string");
      assert.ok(
        content.indexOf("application/vnd.oasis.opendocument.spreadsheet") !==
          -1,
      );
    });

    it("AntarcticaTemps.ods, createFolders: true", async () => {
      const file = loadZipFile("ref/complex_files/AntarcticaTemps.ods");
      const zip = await JSZip.loadAsync(file, { createFolders: true });
      assert.equal(zip.filter(() => true).length, 27);
      const content = await zip.file("META-INF/manifest.xml").async("string");
      assert.ok(
        content.indexOf("application/vnd.oasis.opendocument.spreadsheet") !==
          -1,
      );
    });
  });
});
