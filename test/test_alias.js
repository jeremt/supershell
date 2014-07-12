
var sh = require('../lib');

sh.config.setAlias('lsHidden', 'ls', ['-a']);

sh.run('lsHidden').on('success', function (output) {
    console.assert(output.indexOf('..') !== -1);
});

sh.run('lsHidden', ['-l']).on('success', function (output) {
    console.assert(output.indexOf('..') !== -1);
});
