
var sh = require('../');

sh.config.setAlias('lsHidden', 'ls', ['-a']);
sh.config.setAlias('lsFull', sh.cmd('ls', ['-l']));

sh('lsHidden').on('success', function (output) {
  console.assert(output.indexOf('..') !== -1);
});

sh('lsHidden', ['-l']).on('success', function (output) {
  console.assert(output.indexOf('..') !== -1);
});

sh('lsFull').on('success', function (output) {
  console.assert(output.indexOf('LICENSE.md') !== -1);
});
