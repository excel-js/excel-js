import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";
import {
  loadZipFile,
  similar,
  MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY,
  checkGenerateStability,
} from "./helpers/test-utils.js";

await describe("unicode", () => {
  it("Zip text file with UTF-8 characters", async () => {
    const expected = loadZipFile("ref/utf8.zip");
    const zip = new JSZip();
    zip.file("amount.txt", "\u20AC15\n");
    const actual = await zip.generateAsync({ type: "binarystring" });
    assert.ok(similar(actual, expected, MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY));
    await checkGenerateStability(actual);
  });

  it("Text file with long unicode string", async () => {
    let expected = "\u20AC";
    for (let i = 0; i < 13; i++) {
      expected = expected + expected;
    }
    const zip = new JSZip();
    zip.file("amount.txt", expected);
    const content = await zip.generateAsync({ type: "binarystring" });
    const loaded = await JSZip.loadAsync(content);
    const fileContent = await loaded.file("amount.txt").async("string");
    assert.equal(fileContent, expected);
  });

  it("Zip text file with UTF-8 characters in filename", async () => {
    const zip = new JSZip();
    zip.file("\u20AC15.txt", "\u20AC15\n");
    const actual = await zip.generateAsync({ type: "binarystring" });
    await checkGenerateStability(actual);
  });

  it("Zip text file with non unicode characters in filename: loadAsync without decodeFileName", async () => {
    const content = loadZipFile("ref/local_encoding_in_name.zip");
    const zipUnicode = await JSZip.loadAsync(content);
    assert.ok(
      !zipUnicode.files[
        "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/"
      ],
    );
    assert.ok(
      !zipUnicode.files[
        "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/\u041D\u043E\u0432\u044B\u0439 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442.txt"
      ],
    );
  });

  it("Zip text file with non unicode characters in filename: loadAsync with decodeFileName", async () => {
    const conversions = {
      "bytes 8d ae a2 a0 ef 20 af a0 af aa a0 2f":
        "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/",
      "bytes 8d ae a2 a0 ef 20 af a0 af aa a0 2f 8d ae a2 eb a9 20 e2 a5 aa e1 e2 ae a2 eb a9 20 a4 ae aa e3 ac a5 ad e2 2e 74 78 74":
        "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/\u041D\u043E\u0432\u044B\u0439 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442.txt",
    };

    const content = loadZipFile("ref/local_encoding_in_name.zip");
    const zipCP866 = await JSZip.loadAsync(content, {
      decodeFileName: function (bytes) {
        let key = "bytes";
        for (let i = 0; i < bytes.length; i++) {
          key += " " + bytes[i].toString(16);
        }
        return conversions[key] || "";
      },
    });
    assert.ok(
      zipCP866.files[
        "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/"
      ],
    );
    assert.ok(
      zipCP866.files[
        "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/\u041D\u043E\u0432\u044B\u0439 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442.txt"
      ],
    );
  });

  it("Zip text file with non unicode characters in filename: generateAsync with encodeFileName", async () => {
    const conversions = {
      "": [],
      "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/": [
        0x8d, 0xae, 0xa2, 0xa0, 0xef, 0x20, 0xaf, 0xa0, 0xaf, 0xaa, 0xa0, 0x2f,
      ],
      "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/\u041D\u043E\u0432\u044B\u0439 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442.txt":
        [
          0x8d, 0xae, 0xa2, 0xa0, 0xef, 0x20, 0xaf, 0xa0, 0xaf, 0xaa, 0xa0,
          0x2f, 0x8d, 0xae, 0xa2, 0xeb, 0xa9, 0x20, 0xe2, 0xa5, 0xaa, 0xe1,
          0xe2, 0xae, 0xa2, 0xeb, 0xa9, 0x20, 0xa4, 0xae, 0xaa, 0xe3, 0xac,
          0xa5, 0xad, 0xe2, 0x2e, 0x74, 0x78, 0x74,
        ],
    };

    function decodeCP866(bytes) {
      for (const text in conversions) {
        if (conversions[text].length === bytes.length) {
          return text;
        }
      }
    }

    function encodeCP866(string) {
      return conversions[string];
    }

    const content = loadZipFile("ref/local_encoding_in_name.zip");
    const zipCP866 = await JSZip.loadAsync(content, {
      decodeFileName: decodeCP866,
    });
    const regeneratedContent = await zipCP866.generateAsync({
      type: "string",
      encodeFileName: encodeCP866,
    });
    const reloaded = await JSZip.loadAsync(regeneratedContent, {
      decodeFileName: decodeCP866,
    });
    assert.ok(
      reloaded.files[
        "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/"
      ],
    );
    assert.ok(
      reloaded.files[
        "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430/\u041D\u043E\u0432\u044B\u0439 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442.txt"
      ],
    );
  });

  it("Zip text file and UTF-8, Pile Of Poo test", async () => {
    const expected = loadZipFile("ref/pile_of_poo.zip");
    const text = "I\xF1t\xEBrn\xE2ti\xF4n\xE0liz\xE6ti\xF8n\u2603\uD83D\uDCA9";
    const zip = new JSZip();
    zip.file(text + ".txt", text, { comment: text });

    const actual = await zip.generateAsync({
      type: "binarystring",
      comment: text,
    });
    await checkGenerateStability(actual);

    const externalZip = await JSZip.loadAsync(expected);
    const externalFile = externalZip.file(text + ".txt");
    assert.ok(externalFile);
    assert.equal(externalFile.comment, text);
    const externalContent = await externalFile.async("string");
    assert.equal(externalContent, text);

    const selfZip = await JSZip.loadAsync(actual);
    const selfFile = selfZip.file(text + ".txt");
    assert.ok(selfFile);
    assert.equal(selfFile.comment, text);
    const selfContent = await selfFile.async("string");
    assert.equal(selfContent, text);
  });
});
