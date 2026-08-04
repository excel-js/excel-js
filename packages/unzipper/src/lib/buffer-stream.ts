import { Transform } from "node:stream";

function bufferStream(entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    const bufferStream = new Transform({
      transform(chunk, _encoding, cb) {
        chunks.push(chunk);
        cb();
      },
    })
      .on("finish", () => {
        resolve(Buffer.concat(chunks));
      })
      .on("error", reject);

    entry.on("error", reject).pipe(bufferStream);
  });
}

export default bufferStream;
