
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

var lsPrev = new sh.Command('cd', ['..']).and('ls', ['package.json']);

sh.run('echo', ['hello'])
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
  console.assert(output === '5');
}).run();

sh.run('ls').pipe(sh.parsers.list()).on('success', function (output) {
  console.assert(output.indexOf('package.json') !== -1);
});
