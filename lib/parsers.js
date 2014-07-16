
/**
 * Parse a vertical list of items.
 *
 * @param {Function} fn an optional function to update the lines of the list
 */
exports.list = function (fn) {
  fn = fn || function (l) { return l; };
  return function (output, code) {
    if (code) return output;
    return output.split('\n').filter(function (el) {
      return el.length;
    }).map(fn);
  }
}

/**
 * Trim the given output.
 */
exports.trim = function () {
  return function (output) {
    if (output.constructor.name === 'String')
      return output.trim();
    return output;
  }
}

/**
 * Parse the given JSON into a Javascript object.
 */
exports.json = function () {
  return function (output) {
    if (output.constructor.name === 'String')
      return JSON.parse(output);
    return output;
  }
}