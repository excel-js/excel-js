import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";
import { loadZipFile } from "./helpers/test-utils.js";

await describe("permissions", () => {
  function assertUnixPermissions(file) {
    function doAsserts(zip, fileName, dir, octal) {
      const mode = parseInt(octal, 8);
      assert.equal(
        zip.files[fileName].dosPermissions,
        null,
        fileName + ", no DOS permissions",
      );
      assert.equal(zip.files[fileName].dir, dir, fileName + " dir flag");
      assert.equal(
        zip.files[fileName].unixPermissions,
        mode,
        fileName + " mode " + octal,
      );
    }

    return JSZip.loadAsync(file, { createFolders: false }).then((zip) => {
      doAsserts(zip, "dir_777/", true, "40777");
      doAsserts(zip, "dir_755/", true, "40755");
      doAsserts(zip, "dir_500/", true, "40500");
      doAsserts(zip, "file_666", false, "100666");
      doAsserts(zip, "file_640", false, "100640");
      doAsserts(zip, "file_400", false, "100400");
      doAsserts(zip, "file_755", false, "100755");
    });
  }

  function assertDosPermissions(file) {
    function doAsserts(zip, fileName, dir, binary) {
      const mode = parseInt(binary, 2);
      assert.equal(
        zip.files[fileName].unixPermissions,
        null,
        fileName + ", no UNIX permissions",
      );
      assert.equal(zip.files[fileName].dir, dir, fileName + " dir flag");
      assert.equal(
        zip.files[fileName].dosPermissions,
        mode,
        fileName + " mode " + mode,
      );
    }

    return JSZip.loadAsync(file, { createFolders: false }).then((zip) => {
      if (zip.files["dir/"]) {
        doAsserts(zip, "dir/", true, "010000");
      }
      if (zip.files["dir_hidden/"]) {
        doAsserts(zip, "dir_hidden/", true, "010010");
      }
      doAsserts(zip, "file", false, "100000");
      doAsserts(zip, "file_ro", false, "100001");
      doAsserts(zip, "file_hidden", false, "100010");
      doAsserts(zip, "file_ro_hidden", false, "100011");
    });
  }

  function reloadAndAssertUnixPermissions(file) {
    return JSZip.loadAsync(file, { createFolders: false })
      .then((zip) => zip.generateAsync({ type: "string", platform: "UNIX" }))
      .then((content) => assertUnixPermissions(content));
  }

  function reloadAndAssertDosPermissions(file) {
    return JSZip.loadAsync(file, { createFolders: false })
      .then((zip) => zip.generateAsync({ type: "string", platform: "DOS" }))
      .then((content) => assertDosPermissions(content));
  }

  const linuxTests = [
    [
      "linux : file created by zip",
      "ref/permissions/linux_zip.zip",
      assertUnixPermissions,
    ],
    [
      "linux : file created by zip, reloaded",
      "ref/permissions/linux_zip.zip",
      reloadAndAssertUnixPermissions,
    ],
    [
      "linux : file created by 7z",
      "ref/permissions/linux_7z.zip",
      assertUnixPermissions,
    ],
    [
      "linux : file created by 7z, reloaded",
      "ref/permissions/linux_7z.zip",
      reloadAndAssertUnixPermissions,
    ],
    [
      "linux : file created by file-roller on ubuntu",
      "ref/permissions/linux_file_roller-ubuntu.zip",
      assertUnixPermissions,
    ],
    [
      "linux : file created by file-roller on ubuntu, reloaded",
      "ref/permissions/linux_file_roller-ubuntu.zip",
      reloadAndAssertUnixPermissions,
    ],
    [
      "linux : file created by file-roller on xubuntu",
      "ref/permissions/linux_file_roller-xubuntu.zip",
      assertUnixPermissions,
    ],
    [
      "linux : file created by file-roller on xubuntu, reloaded",
      "ref/permissions/linux_file_roller-xubuntu.zip",
      reloadAndAssertUnixPermissions,
    ],
    [
      "linux : file created by ark",
      "ref/permissions/linux_ark.zip",
      assertUnixPermissions,
    ],
    [
      "linux : file created by ark, reloaded",
      "ref/permissions/linux_ark.zip",
      reloadAndAssertUnixPermissions,
    ],
    [
      "mac : file created by finder",
      "ref/permissions/mac_finder.zip",
      assertUnixPermissions,
    ],
    [
      "mac : file created by finder, reloaded",
      "ref/permissions/mac_finder.zip",
      reloadAndAssertUnixPermissions,
    ],
  ];

  for (const [name, zipFile, testFn] of linuxTests) {
    it("permissions on " + name, async () => {
      const file = loadZipFile(zipFile);
      await testFn(file);
    });
  }

  const windowsTests = [
    [
      "windows : file created by the compressed folders feature",
      "ref/permissions/windows_compressed_folders.zip",
      assertDosPermissions,
    ],
    [
      "windows : file created by the compressed folders feature, reloaded",
      "ref/permissions/windows_compressed_folders.zip",
      reloadAndAssertDosPermissions,
    ],
    [
      "windows : file created by 7z",
      "ref/permissions/windows_7z.zip",
      assertDosPermissions,
    ],
    [
      "windows : file created by 7z, reloaded",
      "ref/permissions/windows_7z.zip",
      reloadAndAssertDosPermissions,
    ],
    [
      "windows : file created by izarc",
      "ref/permissions/windows_izarc.zip",
      assertDosPermissions,
    ],
    [
      "windows : file created by izarc, reloaded",
      "ref/permissions/windows_izarc.zip",
      reloadAndAssertDosPermissions,
    ],
    [
      "windows : file created by winrar",
      "ref/permissions/windows_winrar.zip",
      assertDosPermissions,
    ],
    [
      "windows : file created by winrar, reloaded",
      "ref/permissions/windows_winrar.zip",
      reloadAndAssertDosPermissions,
    ],
  ];

  for (const [name, zipFile, testFn] of windowsTests) {
    it("permissions on " + name, async () => {
      const file = loadZipFile(zipFile);
      await testFn(file);
    });
  }
});
