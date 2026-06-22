import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import JSZip from "../../dist/index.cjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "..");

export function loadZipFile(name) {
  return readFileSync(join(TEST_DIR, name), "binary");
}

export const MAX_BYTES_DIFFERENCE_PER_ZIP_ENTRY = 18;

export function similar(actual, expected, mistakes) {
  if (JSZip.support.arraybuffer) {
    if (actual instanceof ArrayBuffer) {
      actual = new Uint8Array(actual);
    }
    if (expected instanceof ArrayBuffer) {
      expected = new Uint8Array(expected);
    }
  }

  const actualIsString = typeof actual === "string";
  const expectedIsString = typeof expected === "string";

  if (actual.length !== expected.length) {
    mistakes -= Math.abs((actual.length || 0) - (expected.length || 0));
  }

  for (let i = 0; i < Math.min(actual.length, expected.length); i++) {
    const actualByte = actualIsString ? actual.charCodeAt(i) : actual[i];
    const expectedByte =
      (expectedIsString ? expected.charCodeAt(i) : expected[i]) & 0xff;
    if (actualByte !== expectedByte) {
      mistakes--;
    }
  }

  return mistakes >= 0;
}

export function toString(obj) {
  if (typeof obj === "string" || !obj) {
    return obj;
  }

  if (obj instanceof ArrayBuffer) {
    obj = new Uint8Array(obj);
  }

  let res = "";
  for (let i = 0; i < obj.length; i++) {
    res += String.fromCharCode(obj[i]);
  }
  return res;
}

export function createZipAll() {
  const zip = new JSZip();
  zip.file("Hello.txt", "Hello World\n");
  zip
    .folder("images")
    .file(
      "smile.gif",
      "R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs=",
      { base64: true },
    );
  return zip;
}

const base64Dict = {
  "": "",
  "\xE2\x82\xAC15\n": "4oKsMTUK",
  "test\r\ntest\r\n": "dGVzdA0KdGVzdA0K",
  "all.zip.base64,stream=false":
    "UEsDBAoAAAAAAO+7TTrj5ZWwDAAAAAwAAAAJAAAASGVsbG8udHh0SGVsbG8gV29ybGQKUEsDBAoAAAAAAA9qUToAAAAAAAAAAAAAAAAHAAAAaW1hZ2VzL1BLAwQKAAAAAACZoEg6PD/riikAAAApAAAAEAAAAGltYWdlcy9zbWlsZS5naWZHSUY4N2EFAAUAgAIAAAAA/94ALAAAAAAFAAUAAAIIjA+RZ6sKUgEAO1BLAQIUAAoAAAAAAO+7TTrj5ZWwDAAAAAwAAAAJAAAAAAAAAAAAAAAAAAAAAABIZWxsby50eHRQSwECFAAKAAAAAAAPalE6AAAAAAAAAAAAAAAABwAAABAAAAAzAAAAaW1hZ2VzL1BLAQIUAAoAAAAAAJmgSDo8P+uKKQAAACkAAAAQAAAAAAAAAAAAAAAAAFgAAABpbWFnZXMvc21pbGUuZ2lmUEsFBgAAAAADAAMAqgAAAK8AAAAAAA==",
  "all.zip.base64,stream=true":
    "UEsDBAoACAAAAO+7TToAAAAAAAAAAAAAAAAJAAAASGVsbG8udHh0SGVsbG8gV29ybGQKUEsHCOPllbAMAAAADAAAAFBLAwQKAAAAAAAPalE6AAAAAAAAAAAAAAAABwAAAGltYWdlcy9QSwMECgAIAAAAmaBIOgAAAAAAAAAAAAAAABAAAABpbWFnZXMvc21pbGUuZ2lmR0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADtQSwcIPD/riikAAAApAAAAUEsBAhQACgAIAAAA77tNOuPllbAMAAAADAAAAAkAAAAAAAAAAAAAAAAAAAAAAEhlbGxvLnR4dFBLAQIUAAoAAAAAAA9qUToAAAAAAAAAAAAAAAAHAAAAAAAAAAAAEAAAAEMAAABpbWFnZXMvUEsBAhQACgAIAAAAmaBIOjw/64opAAAAKQAAABAAAAAAAAAAAAAAAAAAaAAAAGltYWdlcy9zbWlsZS5naWZQSwUGAAAAAAMAAwCqAAAAzwAAAAAA",
};

export function base64encode(input) {
  if (!(input in base64Dict)) {
    throw new Error("unknown key '" + input + "' in the base64 dictionary");
  }
  return base64Dict[input];
}

export async function checkGenerateStability(bytesStream, options) {
  options = options || { type: "binarystring" };
  const zip = await new JSZip().loadAsync(bytesStream);
  const content = await zip.generateAsync(options);
  if (!similar(bytesStream, content, 0)) {
    throw new Error("generate stability : not stable");
  }
}

export function checkBasicStreamBehavior(stream) {
  return new Promise((resolve, reject) => {
    let triggeredStream = false;
    stream
      .on("data", () => {
        triggeredStream = true;
      })
      .on("error", (e) => {
        triggeredStream = true;
        reject(e);
      })
      .on("end", () => {
        if (!triggeredStream) {
          reject(new Error("stream callback is async"));
        } else {
          resolve();
        }
      })
      .resume();
    if (triggeredStream) {
      reject(new Error("stream callback is async"));
    }
  });
}
