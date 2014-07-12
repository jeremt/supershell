
/**
 * Apply the given args and keyword args into `str`.
 */
exports.format = function (str, args, kwargs) {
  args = args || [];
  kwargs = kwargs || {};
  return str.replace(/\{([^{}]*)}/g, function (pattern, name) {
    var i = parseInt(name);
    return isNaN(i) ? kwargs[name] : args[i];
  });
}

/**
 * Split by space which are not within double quotes.
 */
exports.split = function (str) {
  var result = str.match(/(?:[^\s"]+|"[^"]*")+/g)
  for (var i in result)
    result[i] = result[i].replace(/[^\\]?"/g, '');
  return result;
}
