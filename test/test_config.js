
var sh = require('../lib');

sh.log.on('error', function (message) {
  console.error('SupershellError: ', message);
});

sh.config.load({
  history: [
    {cmd: 'ls', args: ['-a']}
  ],
  alias: {
    lsHidden: { cmd: 'ls', args: ['-a']}
  },
  vars: {
    headSize: 3,
    projectDir: '$HOME/Projects'
  },
  scripts: {/* Add your scripts here */}
});

sh.exec('ls {projectDir}')
  .pipe(sh.parsers.list())
  .on('success', function (output) {
    console.log(output);
  });

var lsRoot = new sh.Command('ls /');
lsRoot
  .pipe('head', ['-n {headSize}'])
  .pipe(sh.parsers.list())
  .on('success', function (output) {
    console.log(output);
  }).exec();

sh.exec('ls').pipe('head -n 2');