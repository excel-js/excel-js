import { Vars } from "./vars";

export function parse(buffer) {
  var self = words(function (bytes, cb) {
    return function (name) {
      if (offset + bytes <= buffer.length) {
        var buf = buffer.slice(offset, offset + bytes);
        offset += bytes;
        vars.set(name, cb(buf));
      } else {
        vars.set(name, null);
      }
      return self;
    };
  });

  var offset = 0;
  var vars = Vars();
  self.vars = vars.store;

  self.tap = function (cb) {
    cb.call(self, vars.store);
    return self;
  };

  self.into = function (key, cb) {
    if (!vars.get(key)) {
      vars.set(key, {});
    }
    var parent = vars;
    vars = Vars(parent.get(key));
    cb.call(self, vars.store);
    vars = parent;
    return self;
  };

  self.loop = function (cb) {
    var end = false;
    var ender = function () {
      end = true;
    };
    while (end === false) {
      cb.call(self, ender, vars.store);
    }
    return self;
  };

  self.buffer = function (name, size) {
    if (typeof size === "string") {
      size = vars.get(size);
    }
    var buf = buffer.slice(offset, Math.min(buffer.length, offset + size));
    offset += size;
    vars.set(name, buf);

    return self;
  };

  self.skip = function (bytes) {
    if (typeof bytes === "string") {
      bytes = vars.get(bytes);
    }
    offset += bytes;

    return self;
  };

  self.scan = function (name, search) {
    if (typeof search === "string") {
      search = new Buffer(search);
    } else if (!Buffer.isBuffer(search)) {
      throw new Error("search must be a Buffer or a string");
    }
    vars.set(name, null);

    // simple but slow string search
    for (var i = 0; i + offset <= buffer.length - search.length + 1; i++) {
      for (
        var j = 0;
        j < search.length && buffer[offset + i + j] === search[j];
        j++
      );
      if (j === search.length) break;
    }

    vars.set(name, buffer.slice(offset, offset + i));
    offset += i + search.length;
    return self;
  };

  self.peek = function (cb) {
    var was = offset;
    cb.call(self, vars.store);
    offset = was;
    return self;
  };

  self.flush = function () {
    vars.store = {};
    return self;
  };

  self.eof = function () {
    return offset >= buffer.length;
  };

  return self;
}

// convert byte strings to unsigned little endian numbers
function decodeLEu(bytes) {
  var acc = 0;
  for (var i = 0; i < bytes.length; i++) {
    acc += Math.pow(256, i) * bytes[i];
  }
  return acc;
}

// convert byte strings to unsigned big endian numbers
function decodeBEu(bytes) {
  var acc = 0;
  for (var i = 0; i < bytes.length; i++) {
    acc += Math.pow(256, bytes.length - i - 1) * bytes[i];
  }
  return acc;
}

// convert byte strings to signed big endian numbers
function decodeBEs(bytes) {
  var val = decodeBEu(bytes);
  if ((bytes[0] & 0x80) == 0x80) {
    val -= Math.pow(256, bytes.length);
  }
  return val;
}

// convert byte strings to signed little endian numbers
function decodeLEs(bytes) {
  var val = decodeLEu(bytes);
  if ((bytes[bytes.length - 1] & 0x80) == 0x80) {
    val -= Math.pow(256, bytes.length);
  }
  return val;
}

function words(decode) {
  var self = {};

  [1, 2, 4, 8].forEach(function (bytes) {
    var bits = bytes * 8;

    self["word" + bits + "le"] = self["word" + bits + "lu"] = decode(
      bytes,
      decodeLEu,
    );

    self["word" + bits + "ls"] = decode(bytes, decodeLEs);

    self["word" + bits + "be"] = self["word" + bits + "bu"] = decode(
      bytes,
      decodeBEu,
    );

    self["word" + bits + "bs"] = decode(bytes, decodeBEs);
  });

  // word8be(n) == word8le(n) for all n
  self.word8 = self.word8u = self.word8be;
  self.word8s = self.word8bs;

  return self;
}
