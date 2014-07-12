
/**
 * Parse a vertical list of items.
 */
exports.list = function () {
  return function (output, code) {
    if (code) return output;
    return output.split('\n').filter(function (el) {
      return el.length;
    });
  }
}

/**
 * Trim the given output.
 */
exports.trim = function () {
  return function (output) {
    return output.trim();
  }
}