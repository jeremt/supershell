
var sh = require('../lib');

sh.config.setAlias('lsHidden', 'ls', ['-a']);

sh.exec('lsHidden').on('success', function (output) {
    console.assert(output.indexOf('..') !== -1);
});

sh.exec('lsHidden', ['-l']).on('success', function (output) {
    console.assert(output.indexOf('..') !== -1);
});
