
var sh = require('../lib');

sh.config.setAlias('lsHidden', 'ls', ['-a']);
sh.config.setAlias('lsFull', new sh.Command('ls', ['-l']));

sh.exec('lsHidden').on('success', function (output) {
  console.assert(output.indexOf('..') !== -1);
});

sh.exec('lsHidden', ['-l']).on('success', function (output) {
  console.assert(output.indexOf('..') !== -1);
});

sh.exec('lsFull').on('success', function (output) {
  console.assert(output.indexOf('LICENSE.md') !== -1);
});
