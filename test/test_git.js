
var sh = require('../')
  , git = require('../').git;

sh.log.mode = 'log';

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

// refresh should be registered after open a repo.
git.refresh(1.0, [
  'resolve',
  'rebasing',
  'files',
  'branches',
  'commits'
]);
// git.refresh(30.0, 'fetch');

git.exec('file', 'index.coffee').on('success', function (output) {
  console.log('file diff:', output);
});

// git.exec('commit', 'Little update');

setTimeout(function () {
  console.log(git.scope.files);
  console.log(git.scope.branches);
  console.log(git.scope.commits);
  process.exit();
}, 2014.0);