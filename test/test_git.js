
var sh = require('../')
  , git = require('../lib/context/git');

git.on('error', function (output) {
  console.log('GitError:', output);
});

git.exec('clone', 'https://jerem_t@bitbucket.org/jerem_t/sandbox.git', '/tmp/sandbox')
  .on('success', function () {
    console.log('Clone success!');
  });

git.exec('open', '/tmp/sandbox').on('success', function () {
  console.log('Open success: ', git.scope.folder);
});

git.exec('files').on('success', function (files) {
  console.log(files);
});
