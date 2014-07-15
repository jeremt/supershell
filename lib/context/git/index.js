
/**
 * Module dependencies.
 */
var sh = require('../../supershell')
  , fs = require('fs')
  , dns = require('dns')
  , path = require('path')
  , parsers = require('./parsers');

/**
 * This context aim to make easier git commands manipulation. It provides some
 * wrappers on useful git commands and store several informations on the
 * current git repository.
 */
function Git() {
  sh.Context.call(this);

  /**
   * Initialize the context.
   */
  this.ordered = true;
  this.scope = {
    remote: 'origin',
    branch: 'master',
    localCommits: 0,
    maxCommits: 20,
    folder: '',
    url: '',
    connected: false
  };
  this._folderArgs = null;

  /**
   * Ensure that a repository is opened, and can be used.
   */
  this.before(function (e, name) {
    if (['clone', 'open'].indexOf(name) === -1 && !this._folderArgs) {
      e.emit('fail', 'you should init, clone or open a repo to use it.');
      return false;
    }
    return true;
  });

  /**
   * Clone a git repository.
   *
   * @param {String} url the url of the repository
   * @param {String} folder the destination πath
   */
  this.command('clone', function (e, url, folder) {
    var _this = this;
    sh('git', ['clone', url, folder])
      .pipe(sh.parsers.trim())
      .on('success', function (output) {
        _this.scope.url = url;
        _this.scope.folder = folder;
        _this._folderArgs = [
          "--git-dir=" + path.join(folder, ".git"),
          "--work-tree=" + folder
        ];
        e.emit('success', output);
      })
      .on('fail', function (output) { e.emit('fail', output); });
  });

  /**
   * Open a local repository and check whether the given path is a valid
   * git repository.
   *
   * @param {String} folder the path of the repository to open
   */
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
            _this._folderArgs = [
              "--git-dir=" + path.join(folder, ".git"),
              "--work-tree=" + folder
            ];
            sh('git config remote.origin.url')
              .pipe(sh.parsers.trim())
              .on('success', function (output) {
                _this.scope.url = output;
                e.emit('success');
              }).on('fail', function (output) {
                e.emit('fail', output);
              });
          }
        });
      }
    });
  });

  /**
   * Check if the repository url is reachable.
   */
  this.command('resolve', function (e) {
    var _this = this;
    dns.resolve(this.scope.url, function (err) {
      _this.scope.connected = !err;
      if (err)
        e.emit('fail', 'Could not resolve url ' + _this.scope.url + '.');
      else
        e.emit('success');
    });
  });

  /**
   * Check whether the current repository is in rebase mode.
   */
  this.command('rebasing', function (e) {
    var _this = this
      , rebaseFolder = path.join(this.scope.folder, '.git', 'rebase-apply');
    fs.exists(rebaseFolder, function (exists) {
      _this.scope.rebasing = exists;
      e.emit('success', _this.scope.rebasing);
    });
  });

  /**
   * List the commits of the repository.
   */
  this.command('commits', function (e) {
    // TODO
  });

  /**
   * List the status of the current files on the repository.
   */
  this.command('files', function (e) {
    var _this = this
      , args = ['status', '--porcelain', '--untracked-files=all'];
    sh('git', this._folderArgs.concat(args))
      .pipe(sh.parsers.trim())
      .pipe(parsers.files())
      .on('success', function (output) {
        _this.scope.files = output;
        e.emit('success', output);
      })
      .on('fail', function (output) {
        e.emit('fail', output);
      });
  });

  /**
   * Commit all the files staged into the repository.
   *
   * @param {String} message the message of the commit
   * @param {String} amend true to merge this commit with the previous one
   */
  this.command('commit', function (e, message, amend) {
    sh('git', ['commit ', (amend ? '--amend ' : ''), '-m', message])
      .pipe(sh.parsers.trim())
      .on('success', function (output) {
        e.emit('success', output);
      })
      .on('fail', function (output) {
        e.emit('fail', output);
      });
  });

  /**
   * Get the git diff output of the given file.
   */
  this.command('file', function (e, file) {
    sh('git', ['diff', 'HEAD', '--', file])
      .pipe(sh.parsers.trim())
      .pipe(parsers.diff())
      .on('success', function (output) {
        e.emit('success', output);
      })
      .on('fail', function (output) {
        e.emit('fail', output);
      });
  });

}

/**
 * Extends from `Context`.
 */
Git.prototype.__proto__ = sh.Context.prototype;

/**
 * Export this context as a singleton.
 */
module.exports = new Git;
