
var sh = require('../lib');

sh.config.load({
  history: [
    {cmd: 'ls', args: ['-a']}
  ],
  alias: {
    lsHidden: { cmd: 'ls', args: ['-a']}
  },
  vars: {
    name: 'Jeremie',
    size: 10
  },
  scripts: {
    repeat: function (cmd, n) {
      for (var i = 0; i < n; ++i) {
        nextCmd = cmd.clone();
        cmd.and(nextCmd);
        cmd = nextCmd;
      }
    }
  }
});

// sh.exec('repeat', ['ls', 10]);