
var sh = require('../supershell')
  , fs = require('fs')
  , path = require('path');

function Git() {
  sh.Context.call(this);

  this.scope = {
    remote: 'origin',
    branch: 'master',
    localCommits: 0,
    maxCommits: 20,
    folder: ''
  };

  this.command('clone', function (e, url, folder) {
    var _this = this;
    sh('git', ['clone', url, folder])
      .on('success', function (output) {
        _this.scope.folder = folder;
        e.emit('success', output);
      })
      .on('fail', function (output) { e.emit('fail', output); });
  });

  this.command('open', function (e, folder) {
    var _this = this;
    fs.exists(folder, function (exists) {
      if (!exists)
        e.emit('fail', 'Folder ' + folder + ' doesnt exists.');
      else {
        fs.exists(path.join(folder, '.git'), function (exists) {
          if (!exists)
            e.emit('fail', 'Folder ' + folder + ' isn\'t a valid git repo.');
          else {
            _this.scope.folder = folder;
            e.emit('success');
          }
        });
      }
    });
  });

  this.command('commit', function (e, message, amend) {
    sh('git', ['commit ', (amend ? '--amend ' : ''), '-m', message])
      .on('success', function (output) {
        e.emit('success', output);
      })
      .on('fail', function (output) {
        e.emit('fail', output);
      });
  });

}

Git.prototype.__proto__ = sh.Context.prototype;

module.exports = new Git;

// Example
// var git = require('supershell/context/git');
//
// git.maxCommits = 40;
// git.exec('clone', 'https://github.com/jeremt/supershell');
// git.exec('commit', 'Coucou');
//