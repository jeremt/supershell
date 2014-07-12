
var sh = require('../lib');

sh.exec('ls', ['-l'])

  // if succeed then
  .and('echo', ['ls succeed!'])

  // trim the output
  .pipe(sh.parsers.trim())

  // catch the output on success
  .on('success', function (output, cmd) {
    console.log("command:", cmd);
    console.log("output:", output);
  });

// Test with errors
sh.exec('ls file_not_found')

  .pipe(sh.parsers.trim())

  // wont be triggered
  .on('success', function (output) {
    console.log('never called');
  })

  // will be triggered
  .on('fail', function (output, name, code) {
    console.log('fail: ', name, code, output);
  })

  // will be triggered
  .on('finish', function (output, name, code) {
    console.log('finish: ', name, code, output);
  })

  .or(new sh.Command('ls').pipe(sh.parsers.list()))

  .on('success', function (output) {
    console.log('files: ', output);
  });

