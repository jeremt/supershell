
var sh = require('../lib');

sh.run('ls').and('echo', ['hello']);
sh.run('cd', ['..']).or('echo', 'should\'n be displayed');

// Ensure that all commands are finished.
setTimeout(function () {
  console.assert(sh.config.history.length === 2);
}, 100);
