
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
    branches: {
      current: 'master',
      local: ['master'],
      remote: []
    },
    commits: {
      local: [],
      remote: [],
      common: []
    },
    maxCommits: 20,
    folder: '',
    url: '',
    connected: false
  };
  this._initCommands = ['clone', 'open'];
  this._localCommands = [
    'open', 'init', 'resolve', 'commit', 'files', 'file', 'rebasing',
    'stage', 'unstage', 'stageall', 'unstageall', 'checkout', 'branches',
    'commits'
  ];

  /**
   * Ensure that a repository is opened, and can be used.
   */
  this.before(function (e, name) {
    if (this._initCommands.indexOf(name) === -1 && !this.scope.folder.length) {
      e.emit('fail', 'you should init, clone or open a repo to use it.');
      return false;
    }
    if (this._localCommands.indexOf(name) === -1 && !this.scope.connected) {
      e.emit('fail', 'command ' + name + ' requires an internet connection.');
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
        e.emit('fail', 'folder ' + folder + ' doesnt exists.');
      else {
        fs.exists(path.join(folder, '.git'), function (exists) {
          if (!exists)
            e.emit('fail', 'folder ' + folder + ' isn\'t a valid git repo.');
          else {
            _this.scope.folder = folder;
            sh('git config remote.' + _this.scope.remote + '.url')
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
   * Init a new git repository.
   */
  this.command('init', function (e) {
    e.emit('fail', 'TODO: init');
  });

  /**
   * Check if the repository url is reachable.
   */
  this.command('resolve', function (e) {
    var _this = this;
    dns.resolve(this.scope.url, function (err) {
      _this.scope.connected = !err;
      if (err)
        e.emit('fail', 'could not resolve url ' + _this.scope.url + '.');
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
    var _this = this
      , br = this.scope.remote + '/' + this.scope.branches.current
      , count = this.scope.maxCommits
      , args = function (n, br) {
        return [
          'log', '--format="%aN|%B|%cr|%H"',
          '--max-count=' + n
        ].concat([br]);
      };

    // remote commits
    this._exec(e, args(count, 'HEAD..' + br), function (output) {
      _this.scope.commits.remote = output;
      count -= output.length;
    }, 'fail').pipe(parsers.log()).pipe(sh.parsers.trim());

    // local commits
    this._exec(e, args(count, br + '..HEAD'), function (output) {
      _this.scope.commits.local = output;
      count -= output.length;
    }, 'fail').pipe(parsers.log()).pipe(sh.parsers.trim())

    // common commits
      .on('success', function () {
        var a = args(count, '--skip=' + _this.scope.commits.local.length);
        _this._exec(e, a, function (output) {
          _this.scope.commits.common = output;
          e.emit('success', _this.scope.commits);
        }, 'fail').pipe(parsers.log()).pipe(sh.parsers.trim());
      });

  });

  /**
   * List the status of the current files on the repository.
   */
  this.command('files', function (e) {
    var args = ['status', '--porcelain', '--untracked-files=all'];
    this._exec(e, args, function (files) {
      this.scope.files = files;
    }).pipe(parsers.files()).pipe(sh.parsers.trim());
  });

  /**
   * List the branches of the repository.
   */
  this.command('branches', function (e) {
    this._exec(e, ['branch', '-a'], function (branches) {
      this.scope.branches = branches;
    }).pipe(parsers.branches());
  });

  /**
   * Commit all the files staged into the repository.
   *
   * @param {String} message the message of the commit
   * @param {String} amend true to merge this commit with the previous one
   */
  this.command('commit', function (e, message, amend) {
    var args = ['commit ', (amend ? '--amend ' : ''), '-m', '"' + message + '"'];
    this._exec(e, args).pipe(sh.parsers.trim());
  });

  /**
   * Get the git diff output of the given file.
   */
  this.command('file', function (e, file) {
    this._exec(e, ['diff', 'HEAD', '--', file])
      .pipe(sh.parsers.trim())
      .pipe(parsers.diff());
  });

  /**
   * Stage the given file.
   */
  this.command('stage', function (e, file) {
    this._exec(e, ['add', '--all', '--', file]).pipe(sh.parsers.trim());
  });

  /**
   * Stage all files of the repository.
   */
  this.command('stageall', function (e) {
    this._exec(e, ['add', '--all', '.']).pipe(sh.parsers.trim());
  });

  /**
   * Unstage the given file.
   */
  this.command('unstage', function (e, file) {
    this._exec(e, ['reset', '--', file]).pipe(sh.parsers.trim());
  });

  /**
   * Unstage all the staged files.
   */
  this.command('unstageall', function (e) {
    this._exec(e, ['reset', '.']).pipe(sh.parsers.trim());
  });

  /**
   * Checkout a branch or a file from its name.
   */
  this.command('checkout', function (e, name) {
    this._exec(e, ['checkout', '--', name]).pipe(sh.parsers.trim());
  });

  /**
   * Clean the repository.
   */
  this.command('clean', function (e) {
    this._exec(e, ['clean', '-fdx']).pipe(sh.parsers.trim());
  });

  // TODO
  // create
  // rebase
  // push
  // sync
  // publish
  // finish
  // fetch

  /**
   * Helper to run git commands in the right repository.
   *
   * @param {EventEmitter} e the event emitter to handle success and fail
   * @param {Array} args the arguments of the git command
   * @param {Function} fn an optional function to call on success
   * @param {Boolean} events defines events that should be emitted
   */
  this._exec = function (e, args, fn, events) {
    var _this = this;
    fn = fn || function () {};
    events = events ? events : ['success', 'fail'];
    events = events.constructor.name == 'Array' ? events : [events];
    return sh('git', [
          "--git-dir=" + path.join(this.scope.folder, ".git"),
          "--work-tree=" + this.scope.folder
        ].concat(args))
      .on('success', function (output) {
        fn.call(_this, output);
        if (events.indexOf('success') !== -1)
          e.emit('success', output);
      })
      .on('fail', function (output) {
        if (events.indexOf('fail') !== -1)
          e.emit('fail', output);
      });
  }

}

/**
 * Extends from `Context`.
 */
Git.prototype.__proto__ = sh.Context.prototype;

/**
 * Export this context as a singleton.
 */
module.exports = new Git;
