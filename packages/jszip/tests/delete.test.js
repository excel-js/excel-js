import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";
import {
  loadZipFile,
  similar,
  MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
  checkGenerateStability,
} from "./helpers/test-utils.js";

function testDeleting(name, zipName, buildZip) {
  it(name, async () => {
    const expected = await loadZipFile(zipName);
    const zip = buildZip();
    const actual = await zip.generateAsync({ type: "binarystring" });
    assert.ok(
      similar(actual, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY),
      "Generated ZIP matches reference ZIP",
    );
  });
}

await describe("delete", () => {
  testDeleting("Delete file", "ref/text.zip", () => {
    const zip = new JSZip();
    zip.file("Remove.txt", "This file should be deleted\n");
    zip.file("Hello.txt", "Hello World\n");
    zip.remove("Remove.txt");
    return zip;
  });

  testDeleting("Delete file in folder", "ref/folder.zip", () => {
    const zip = new JSZip();
    zip
      .folder("folder")
      .file("Remove.txt", "This folder and file should be deleted\n");
    zip.remove("folder/Remove.txt");
    return zip;
  });

  testDeleting(
    "Delete file in folder, with a relative path",
    "ref/folder.zip",
    () => {
      const zip = new JSZip();
      const folder = zip.folder("folder");
      folder.file("Remove.txt", "This folder and file should be deleted\n");
      folder.remove("Remove.txt");
      return zip;
    },
  );

  testDeleting("Delete folder", "ref/text.zip", () => {
    const zip = new JSZip();
    zip
      .folder("remove")
      .file("Remove.txt", "This folder and file should be deleted\n");
    zip.file("Hello.txt", "Hello World\n");
    zip.remove("remove");
    return zip;
  });

  testDeleting("Delete folder with a final /", "ref/text.zip", () => {
    const zip = new JSZip();
    zip
      .folder("remove")
      .file("Remove.txt", "This folder and file should be deleted\n");
    zip.file("Hello.txt", "Hello World\n");
    zip.remove("remove/");
    return zip;
  });

  testDeleting("Delete unknown path", "ref/text.zip", () => {
    const zip = new JSZip();
    zip.file("Hello.txt", "Hello World\n");
    zip.remove("unknown_file");
    zip.remove("unknown_folder/Hello.txt");
    return zip;
  });

  testDeleting("Delete nested folders", "ref/text.zip", () => {
    const zip = new JSZip();
    zip
      .folder("remove")
      .file("Remove.txt", "This folder and file should be deleted\n");
    zip.folder("remove/second").file("Sub.txt", "This should be removed");
    zip.file("remove/second/another.txt", "Another file");
    zip.file("Hello.txt", "Hello World\n");
    zip.remove("remove");
    return zip;
  });

  it("Delete nested folders from relative path", async () => {
    const zip = new JSZip();
    zip.folder("folder");
    zip.folder("folder/1/2/3");
    zip.folder("folder").remove("1");
    const actual = await zip.generateAsync({ type: "binarystring" });
    const expected = await loadZipFile("ref/folder.zip");
    assert.ok(
      similar(actual, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY),
      "Generated ZIP matches reference ZIP",
    );
    await checkGenerateStability(actual);
  });
});
