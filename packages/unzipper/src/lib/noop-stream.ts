import { Transform, type TransformCallback } from "node:stream";

class NoopStream extends Transform {
  override _transform(
    _chunk: unknown,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    callback();
  }
}

export default NoopStream;
