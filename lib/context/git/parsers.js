
var parsers = require('../../parsers');

/**
 * Parse a list of files with their status.
 */
exports.files = function () {
  var statusString = function (statusCode) {
    switch (statusCode) {
      case 'M': return "modified";
      case 'A': return "added";
      case 'D': return "deleted";
      case 'R': return "renamed";
      case 'C': return "copied";
      case 'U': return "updated";
      default: throw Error("Unsupported status type #{statusCode}.")
    }
  }
  return function (output, code) {
    if (code) return output;
    var staged = []
      , unstaged = []
      , files = parsers.list()(output, 0);
    for (var i in files) {
      var statusCode = files[i].substr(0, 2);
      var f = files[i].substr(3);
      if (statusCode === '??')
        unstaged.push({status: 'untracked', file: f});
      else if (statusCode[1] === ' ')
        staged.push({status: statusString(statusCode[0]), file: f});
      else
        unstaged.push({status: statusString(statusCode[1]), file: f});
    }
    return { staged: staged, unstaged: unstaged };
  };
};

/**
 * Parse a git formated log output.
 *
 * @param {Array<String>} fields the fields into the log output.
 *
 * @example
 *   parsers.log(['author', 'message'])
 */
exports.log = function (fields) {
  return function (output, code) {
    if (code) return output;
    var commits = [];
    // TODO
  }
}

/**
 * Parse a git diff output.
 */
exports.diff = function () {
  return function (output, code) {
    if (code) return output;
    //
  };
};