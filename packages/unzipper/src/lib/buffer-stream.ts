import { Transform } from "node:stream";

import BluebirdPromise from "bluebird";

function bufferStream(entry): BluebirdPromise<Buffer<ArrayBuffer>> {
  return new BluebirdPromise<Buffer<ArrayBuffer>>(function (resolve, reject) {
    const chunks: Uint8Array<ArrayBufferLike>[] = [];

    const bufferStream = new Transform()
      .on("finish", function () {
        resolve(Buffer.concat(chunks));
      })
      .on("error", reject);

    bufferStream._transform = function (chunk, _encoding, cb) {
      chunks.push(chunk);
      cb();
    };

    entry.on("error", reject).pipe(bufferStream);
  });
}

export default bufferStream;
