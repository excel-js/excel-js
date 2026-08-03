import { Duplex, PassThrough, Transform } from "node:stream";

import BluebirdPromise from "bluebird";

class PullStream extends Duplex {
  constructor() {
    super({ decodeStrings: false, objectMode: true });
    this.buffer = Buffer.from("");
    var self = this;
    self.on("finish", function () {
      self.finished = true;
      self.emit("chunk", false);
    });
  }

  _write(chunk, e, cb) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.cb = cb;
    this.emit("chunk");
  }

  stream(eof, includeEof) {
    var p = new PassThrough();
    var done,
      self = this;

    function cb() {
      if (typeof self.cb === "function") {
        var callback = self.cb;
        self.cb = undefined;
        return callback();
      }
    }

    function pull() {
      var packet;
      if (self.buffer?.length) {
        if (typeof eof === "number") {
          packet = self.buffer.slice(0, eof);
          self.buffer = self.buffer.slice(eof);
          eof -= packet.length;
          done = !eof;
        } else {
          var match = self.buffer.indexOf(eof);
          if (match !== -1) {
            self.match = match;
            if (includeEof) match += eof.length;
            packet = self.buffer.slice(0, match);
            self.buffer = self.buffer.slice(match);
            done = true;
          } else {
            var len = self.buffer.length - eof.length;
            if (len <= 0) {
              cb();
            } else {
              packet = self.buffer.slice(0, len);
              self.buffer = self.buffer.slice(len);
            }
          }
        }
        if (packet)
          p.write(packet, function () {
            if (
              self.buffer.length === 0 ||
              (eof.length && self.buffer.length <= eof.length)
            )
              cb();
          });
      }

      if (!done) {
        if (self.finished) {
          self.removeListener("chunk", pull);
          self.emit("error", new Error("FILE_ENDED"));
          return;
        }
      } else {
        self.removeListener("chunk", pull);
        p.end();
      }
    }

    self.on("chunk", pull);
    pull();
    return p;
  }

  pull(eof, includeEof) {
    if (eof === 0) return BluebirdPromise.resolve("");

    if (!isNaN(eof) && this.buffer.length > eof) {
      var data = this.buffer.slice(0, eof);
      this.buffer = this.buffer.slice(eof);
      return BluebirdPromise.resolve(data);
    }

    var buffer = Buffer.from(""),
      self = this;

    var concatStream = new Transform();
    concatStream._transform = function (d, e, cb) {
      buffer = Buffer.concat([buffer, d]);
      cb();
    };

    var rejectHandler;
    var pullStreamRejectHandler;
    return new BluebirdPromise(function (resolve, reject) {
      rejectHandler = reject;
      pullStreamRejectHandler = function (e) {
        self.__emittedError = e;
        reject(e);
      };
      if (self.finished) return reject(new Error("FILE_ENDED"));
      self.once("error", pullStreamRejectHandler);
      self
        .stream(eof, includeEof)
        .on("error", reject)
        .pipe(concatStream)
        .on("finish", function () {
          resolve(buffer);
        })
        .on("error", reject);
    }).finally(function () {
      self.removeListener("error", rejectHandler);
      self.removeListener("error", pullStreamRejectHandler);
    });
  }

  _read() {}
}

export default PullStream;
