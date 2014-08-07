
var parsers = require('../../parsers');

/**
 * Parse a list of files with their status.
 */
exports.files = function () {
  var models = {
    conflicted: {
      "added by us":     /AU/,
      "deleted by us":   /DU/,
      "deleted by them": /UD/,
      "added by them":   /UA/,
      "both deleted":    /DD/,
      "both added":      /AA/,
      "both modified":   /UU/
    },
    staged: {
      "not updated":     / [MD]/,
      "deleted":         /D[ M]/,
      "modified":        /M[ MD]/,
      "added":           /A[ MD]/,
      "renamed":         /R[ MD]/,
      "copied":          /C[ MD]/
    },
    unstaged: {
      "same changes":    /[MARC] /,
      "modified":        /[ MARC]M/,
      "deleted":         /[ MARC]D/,
      "untracked":      /\?\?/
    }
  };
  return function (output, code) {
    if (code) return output;
    var result = {
        staged: [],
        unstaged: [],
        conflicted: []
      }, files = parsers.list()(output, 0);

    for (var i in files) {
      var statusCode = files[i].substr(0, 2),
          f = files[i].substr(3),
          found = false;
      for (var key in models) {
        for (var label in models[key]) {
          if (models[key][label].test(statusCode)) {
            found = true;
            if (label !== "not updated")
              result[key].push({label: label, file: f});
          }
        }
      }
      if (!found)
        throw new Error("Unknown status code \"" + statusCode + "\".");
    }
    return result;
  };
};

/**
 * Parse a git formated log output.
 * @param {String} sep the separator to use between each field
 * @param {Array<String>} fields the fields into the log output.
 *
 * @example
 *   parsers.log('|', ['author', 'message'])
 */
exports.log = function (sep, fields) {
  sep = sep || '|';
  fields = fields || ['author', 'message', 'date', 'hash'];
  return function (output, code) {
    if (code) return output;
    var result = []
      , index = 0;
    while (output.length > 1) {
      var commit = {};
      for (var i in fields) {
        index = output.indexOf(Number(i) + 1 === fields.length ? '\n' : sep);
        commit[fields[i]] = output.substr(0, index).trim();
        output = output.substr(index + 1);
      }
      result.push(commit);
    }
    return result;
  }
}

/**
 * Parse the output of the `git branch -a` command.
 */
exports.branches = function () {
  return function (output, code) {
    if (code) return output;
    var branches = parsers.list()(output, 0)
      , result = { current: null, local: [], remote: [] };
    for (var i in branches) {
      if (branches[i].indexOf('HEAD') !== -1)
        continue;
      var br = branches[i].substr(2).split('/')
        , name = '';
      if (br[0] === 'remotes') {
        name = br.slice(2).join('/')
        result.remote.push(name);
      }
      else {
        name = br.join('/');
        result.local.push(name);
      }
      if (branches[i].substr(0, 2) === '* ')
        result.current = name;
    }
    return result;
  }
}

/**
 * Parse a git diff output.
 */
exports.diff = function () {
  return function (str, code) {
    if (code) return str;
    var result = []
      , lineMinus = 0
      , linePlus = 0
      , isFirst = true
      , nextOne = 0;

    var parseHeader = function () {
      str = str.substr(str.indexOf('@@') + 3);
      var header = str.substr(0, str.indexOf('@@') - 1)
        , minus = header
            .substr(header.indexOf('-') + 1)
            .substr(0, header.indexOf(',') - 1)
        , plus = header
            .substr(header.indexOf('+') + 1)
            .substr(0, header.indexOf(',') - 1);
      lineMinus = Math.min(~~minus, ~~plus);
      linePlus = Math.min(~~minus, ~~plus);
      str = str.substr(header.length + 3);
    }

    var parseContent = function (content) {
      var lines = [];
      content = parsers.list()(content, 0);
      for (var i in content) {
        var minus = null
          , plus = null
          , type = '';
        switch (content[i][0]) {
          case '-':
            minus = lineMinus;
            lineMinus += 1;
            type = 'minus';
            break;
          case '+':
            plus = linePlus;
            linePlus += 1;
            type = 'plus';
            break;
          default:
            minus = lineMinus;
            plus = linePlus;
            lineMinus += 1;
            linePlus += 1;
        }
        lines.push({
          linePlus: plus,
          lineMinus: minus,
          content: content[i],
          type: type
        });
      }
      return lines;
    }

    while (nextOne !== -1) {
      parseHeader();
      nextOne = str.indexOf('@@');
      if (nextOne === -1)
        lines = parseContent(str)
      else
        lines = parseContent(str.substr(0, nextOne));
      result.push(lines);
    }
    return result;

  };
};
