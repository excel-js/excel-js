/**
 * archiver-utils
 *
 * Copyright (c) 2015 Chris Talkington.
 * Licensed under the MIT license.
 * https://github.com/archiverjs/archiver-utils/blob/master/LICENSE
 */
var fs = require("graceful-fs");
var lazystream = require("../lazystream/index.js");
var normalizePath = require("normalize-path");
var defaults = require("lodash.defaults");

var Stream = require("stream").Stream;
var PassThrough = require("node:stream").PassThrough;

var utils = (module.exports = {});

utils.dateify = function (dateish) {
  dateish = dateish || new Date();

  if (dateish instanceof Date) {
    dateish = dateish;
  } else if (typeof dateish === "string") {
    dateish = new Date(dateish);
  } else {
    dateish = new Date();
  }

  return dateish;
};

// this is slightly different from lodash version
utils.defaults = function (object, source, guard) {
  var args = arguments;
  args[0] = args[0] || {};

  return defaults(...args);
};

utils.isStream = function (source) {
  return source instanceof Stream;
};

utils.lazyReadStream = function (filepath) {
  return new lazystream.Readable(function () {
    return fs.createReadStream(filepath);
  });
};

utils.normalizeInputSource = function (source) {
  if (source === null) {
    return new Buffer(0);
  } else if (typeof source === "string") {
    return new Buffer(source);
  } else if (utils.isStream(source) && !source._readableState) {
    var normalized = new PassThrough();
    source.pipe(normalized);

    return normalized;
  }

  return source;
};

utils.sanitizePath = function (filepath) {
  return normalizePath(filepath, false)
    .replace(/^\w+:/, "")
    .replace(/^(\.\.\/|\/)+/, "");
};

utils.trailingSlashIt = function (str) {
  return str.slice(-1) !== "/" ? str + "/" : str;
};
