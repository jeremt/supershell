
// var sh = require('../lib');

// // the first argument is the function to call after the script.
// // Its first parameter is the output of the script, the second one is the
// // error code if failed, 0 otherwise.
// sh.config.addScript('ncpu', function (next, label) {
//   sh.run('sysctl', ['kern.ncpu']).on('success', function (output) {
//     next(output.substr(output.indexOf(': ')), 0);
//   }).on('fail', next);
//   // TODO: same thing with /proc
// });

// sh.run('ncpu').on('success', function (output) {
//   console.log(output);
// });
