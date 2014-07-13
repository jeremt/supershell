
var git = require('../lib/context/git');

git.on('error', function (output) {
  console.log(output);
});

git.exec('clone', 'https://github.com/jeremt/supershell.git', '/tmp/supershell')
  .on('success', function () {
    console.log('Clone success!');
  });

git.exec('open', '/tmp/supershell').on('success', function () {
  console.log('Open success: ', git.scope.folder);
});