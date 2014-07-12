
var sh = require('../lib');

function checkOutput(toCheck) {
  return function (output) {
    console.assert(output === toCheck);
  }
}

function logOutput() {
  return function (output) {
    console.log(output);
  }
}

var lsPrev = new sh.Command('echo', ['before ls']).and('ls', ['package.json']);

sh.exec('echo', ['hello'])
  .on('success', checkOutput('hello\n'))

  .and('ls', ['lol'])
  .on('fail', checkOutput('ls: lol: No such file or directory\n'))

  .or('echo', ['finish'])
  .on('success', checkOutput('finish\n'))

  .and('echo', ['other'])
  .on('success', checkOutput('other\n'))

  .and(lsPrev)
  .on('success', checkOutput('package.json\n'));

// pipe and parser

var cmd = new sh.Command('ls');
cmd.pipe('wc', ['-l']).pipe(sh.parsers.trim()).on('success', function (output) {
  console.assert(parseInt(output) !== NaN);
}).exec();

sh.exec('ls').pipe(sh.parsers.list()).on('success', function (output) {
  console.assert(output.indexOf('package.json') !== -1);
});
