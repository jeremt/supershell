
var sh = require('../');

sh.config.load({
  history: [
    {cmd: 'ls', args: ['-a']}
  ],
  alias: {
    lsHidden: { cmd: 'ls', args: ['-a']}
  },
  scope: {
    headSize: 3,
    projectDir: '$HOME/Projects'
  },
  scripts: {/* Add your scripts here */}
});

sh('ls {projectDir}')
  .pipe(sh.parsers.list())
  .on('success', function (output) {
    console.log(output);
  });

var lsRoot = sh('ls /');
lsRoot
  .pipe('head', ['-n {headSize}'])
  .pipe(sh.parsers.list())
  .on('success', function (output) {
    console.log(output);
  });

sh('ls').pipe('head -n 2');

sh('ls').pipe('grep', ['README']).on('success', function (output) {
  console.assert(output === 'README.md\n');
});