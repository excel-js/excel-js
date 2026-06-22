import assert from "node:assert";
import { describe, it } from "node:test";

import JSZip from "../dist/index.cjs";
import { loadZipFile, createZipAll } from "./helpers/test-utils.js";

function createPromiseProxy(OriginalPromise) {
  function MyShinyPromise(input) {
    if (input.then) {
      this._promise = input;
    } else {
      this._promise = new OriginalPromise(input);
    }
    MyShinyPromise.calls++;
  }
  MyShinyPromise.calls = 0;
  MyShinyPromise.prototype = {
    then: function (onFulfilled, onRejected) {
      return new MyShinyPromise(this._promise.then(onFulfilled, onRejected));
    },
    catch: function (onRejected) {
      return new MyShinyPromise(this._promise.catch(onRejected));
    },
    isACustomImplementation: true,
  };

  MyShinyPromise.resolve = function (value) {
    return new MyShinyPromise(OriginalPromise.resolve(value));
  };
  MyShinyPromise.reject = function (value) {
    return new MyShinyPromise(OriginalPromise.reject(value));
  };
  MyShinyPromise.all = function (value) {
    return new MyShinyPromise(OriginalPromise.all(value));
  };
  return MyShinyPromise;
}

await describe("external", () => {
  it("JSZip.external.Promise", () => {
    assert.ok(JSZip.external.Promise);
    assert.ok(JSZip.external.Promise.resolve);
    assert.ok(JSZip.external.Promise.reject);
  });

  it("load JSZip doesn't override the global Promise", () => {
    assert.equal(Promise, JSZip.external.Promise);
  });

  it("external.Promise can be replaced in .async()", async () => {
    const OriginalPromise = JSZip.external.Promise;
    const MyShinyPromise = createPromiseProxy(OriginalPromise);

    JSZip.external.Promise = MyShinyPromise;

    const promise = createZipAll()
      .file("Hello.txt")
      .async("string")
      .then(() => {
        assert.ok(
          MyShinyPromise.calls > 0,
          "at least 1 call of the new Promise",
        );
        JSZip.external.Promise = OriginalPromise;
      });

    assert.ok(
      promise.isACustomImplementation,
      "the custom implementation is used",
    );
    await promise;
  });

  it("external.Promise can be replaced in .generateAsync()", async () => {
    const OriginalPromise = JSZip.external.Promise;
    const MyShinyPromise = createPromiseProxy(OriginalPromise);

    JSZip.external.Promise = MyShinyPromise;

    const promise = createZipAll()
      .generateAsync({ type: "string" })
      .then(() => {
        assert.ok(
          MyShinyPromise.calls > 0,
          "at least 1 call of the new Promise",
        );
        JSZip.external.Promise = OriginalPromise;
      });

    assert.ok(
      promise.isACustomImplementation,
      "the custom implementation is used",
    );
    await promise;
  });

  it("external.Promise can be replaced in .loadAsync()", async () => {
    const all = loadZipFile("ref/all.zip");
    const OriginalPromise = JSZip.external.Promise;
    const MyShinyPromise = createPromiseProxy(OriginalPromise);

    JSZip.external.Promise = MyShinyPromise;

    const promise = JSZip.loadAsync(all).then(() => {
      assert.ok(MyShinyPromise.calls > 0, "at least 1 call of the new Promise");
      JSZip.external.Promise = OriginalPromise;
    });

    assert.ok(
      promise.isACustomImplementation,
      "the custom implementation is used",
    );
    await promise;
  });
});
