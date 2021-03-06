
var sh = require('../');

// Workspace context

var workspace = new sh.Context();

workspace.scope.path = '$HOME/Work';
workspace.scope.list = [];

workspace.command('init', function (e) {
  sh('mkdir', ['-p', this.scope.path])
    .on('success', function () {
      e.emit('success');
    })
    .on('fail', function (output) {
      e.emit('fail', output);
    });
});

workspace.command('create', function (e, name) {
  var _this = this;
  if (this.scope.list.indexOf(name) !== -1)
    e.emit('fail', 'Project ' + name + 'already exists.', 'create');
  else {
    sh('mkdir', [this.scope.path + '/' + name])
      .on('success', function (output) {
        e.emit('success', output);
      })
      .on('fail', function (output) {
        e.emit('fail', output);
      });
  }
});

workspace.command('list', function (e) {
  var _this = this;
  sh('ls', [_this.scope.path])
    .pipe(sh.parsers.trim())
    .pipe(sh.parsers.list())
    .on('success', function (output) {
      _this.scope.list = output;
      e.emit('success');
    })
    .on('fail', function (output) {
      e.emit('fail', output);
    });
});

workspace.on('refresh', function () {
  console.log('Refresh workspace...');
});

workspace.refresh(0.5, 'list');

workspace.on('error', function (output) {
  console.log('error: ', output);
});

workspace.exec('init').on('success', function () {
  console.log('Init ok.');
});

workspace.exec('create', 'test')
  .on('success', function () {
    console.log('Create ok.');
  })
  .on('fail', function (output) {
    console.log('failed: ' + output);
  });

setTimeout(function () {
  process.exit();
}, 3000.0);
