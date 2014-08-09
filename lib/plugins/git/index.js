
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
var git = new sh.Context();

/**
 * Initialize the context.
 */
git.ordered = true;
git.scope = {
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
git._initCommands = ['clone', 'open'];
git._localCommands = [
  'open', 'init', 'resolve', 'commit', 'files', 'file', 'rebasing',
  'stage', 'unstage', 'stageall', 'unstageall', 'checkout', 'branches',
  'commits'
];

/**
 * Helper to run git commands in the right repository.
 *
 * @param {EventEmitter} e the event emitter to handle success and fail
 * @param {Array} args the arguments of the git command
 * @param {Function} fn an optional function to call on success
 * @param {Boolean} events defines events that should be emitted
 */
function _exec(e, args, fn, events) {
  if (fn && fn.constructor.name !== 'Function') {
    events = fn;
    fn = undefined;
  }
  events = events !== undefined ? events : ['success', 'fail'];
  events = events.constructor.name === 'Array' ? events : [events];
  fn = fn || function () {};
  return sh('git', [
        "--git-dir=" + path.join(git.scope.folder, ".git"),
        "--work-tree=" + git.scope.folder
      ].concat(args))
    .on('success', function (output) {
      fn.call(git, output);
      if (events.indexOf('success') !== -1)
        e.emit('success', output);
    })
    .on('fail', function (output) {
      if (events.indexOf('fail') !== -1)
        e.emit('fail', output);
    });
}

/**
 * Parse git remote url.
 */
function parseRemote(input) {
  var match = null;

  // ssh
  if (/git@([\w\.]+\.\w{2,4})\:(\w+)\/(\w+)\.git/.test(input)) {
    match = /git@([\w\.]+\.\w{2,4})\:(\w+)\/(\w+)\.git/.exec(input);
  }

  // https
  else if (/https:\/\/([\w\.]+\.\w{2,4})\/(\w+)\/(\w+)\.git/.test(input)) {
    match = /https:\/\/([\w\.]+\.\w{2,4})\/(\w+)\/(\w+)\.git/.exec(input);
  }

  return match ? { host: match[1], user: match[2], repo: match[3] } : null;
}

/**
 * Validators.
 */
function _isInit(e, name) {
  if (!git.scope.folder.length) {
    e.emit('fail', 'you should init, clone or open a repo to use it.');
    return false;
  }
  return true;
}

function _isConnected(e, name) {
  if (!git.scope.connected) {
    e.emit('fail', 'command ' + name + ' requires an internet connection.');
    return false;
  }
  return true;
}

function _isClear(e, name) {
  if (git.scope.files.staged.length || git.scope.files.unstaged.length) {
    e.emit('fail', 'please commit or stage your changes.');
    return false;
  }
  return true;
}

function _isNotRebasing(e, name) {
  if (git.scope.rebasing) {
    e.emit('fail', 'cannot execute ' + name + ' during a rebase.');
    return false;
  }
  return true;
}

/**
 * Clone a git repository.
 *
 * @param {String} url the url of the repository
 * @param {String} folder the destination πath
 */
git.command('clone', function (e, url, folder) {
  sh('git', ['clone', url, folder])
    .pipe(sh.parsers.trim())
    .on('success', function (output) {
      git.scope.url = url;
      git.scope.folder = folder;
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
git.command('open', function (e, folder) {
  fs.exists(folder, function (exists) {
    if (!exists)
      e.emit('fail', 'folder ' + folder + ' doesnt exists.');
    else {
      fs.exists(path.join(folder, '.git'), function (exists) {
        if (!exists)
          e.emit('fail', 'folder ' + folder + ' isn\'t a valid git repo.');
        else {
          git.scope.folder = folder;
          var args = ['config', 'remote.' + git.scope.remote + '.url'];
          _exec(e, args, function (output) {
            git.scope.url = output;
          });
        }
      });
    }
  });
});

/**
 * Init a new git repository.
 */
git.command('init', function (e) {
  e.emit('fail', 'TODO: init');
});

/**
 * Check if the repository url is reachable.
 */
git.command('resolve', function (e) {
  var remote = parseRemote(git.scope.url);
  if (remote === null)
    e.emit('fail', 'invalid remote url ' + git.scope.url + '.');
  else {
    dns.resolve(remote['host'], function (err) {
      git.scope.connected = !err;
      if (err)
        e.emit('fail', 'could not resolve url ' + git.scope.url + '.');
      else
        e.emit('success');
    });
  }
}, [_isInit]);

/**
 * Check whether the current repository is in rebase mode.
 */
git.command('rebasing', function (e) {
  var rebaseFolder = path.join(git.scope.folder, '.git', 'rebase-apply');
  fs.exists(rebaseFolder, function (exists) {
    git.scope.rebasing = exists;
    e.emit('success', git.scope.rebasing);
  });
}, [_isInit]);

/**
 * List the commits of the repository.
 */
git.command('commits', function (e) {
  var br = git.scope.remote + '/' + git.scope.branches.current
    , count = git.scope.maxCommits
    , args = function (n, br) {
      return [
        'log', '--format="%aN|%B|%cr|%H"',
        '--max-count=' + n
      ].concat([br]);
    };

  // remote commits
  if (git.scope.connected) {
    _exec(e, args(count, 'HEAD..' + br), function (output) {
      git.scope.commits.remote = output;
      count -= output.length;
    }, 'fail').pipe(parsers.log()).pipe(sh.parsers.trim());
  }

  // local commits
  _exec(e, args(count, br + '..HEAD'), function (output) {
    git.scope.commits.local = output;
    count -= output.length;
  }, 'fail').pipe(parsers.log()).pipe(sh.parsers.trim())

  // common commits
    .on('success', function () {
      var a = args(count, '--skip=' + git.scope.commits.local.length);
      _exec(e, a, function (output) {
        git.scope.commits.common = output;
        e.emit('success', git.scope.commits);
      }, 'fail').pipe(parsers.log()).pipe(sh.parsers.trim());
    });

}, [_isInit, _isNotRebasing]);

/**
 * List the status of the current files on the repository.
 */
git.command('files', function (e) {
  var args = ['status', '--porcelain', '--untracked-files=all'];
  _exec(e, args, function (files) {
    git.scope.files = files;
  }).pipe(parsers.files()).pipe(sh.parsers.trim());
}, [_isInit]);

/**
 * List the branches of the repository.
 */
git.command('branches', function (e) {
  _exec(e, ['branch', '-a'], function (branches) {
    git.scope.branches = branches;
  }).pipe(parsers.branches());
}, [_isInit, _isNotRebasing]);

/**
 * Create a new branch from its name and set its up-stream to the corresponding
 * remote branch.
 */
git.command('branch', function (e, name) {
  _exec(e, ['checkout', '-b', name]); // push -u origin name
});

/**
 * Remove a branch locally as well as remotelly.
 */
git.command('removeBranch', function (e, name) {
  console.log("TODO: branch -D " + name + " && push origin :" + name);
});

/**
 * Commit all the files staged into the repository.
 *
 * @param {String} message the message of the commit
 * @param {String} amend true to merge this commit with the previous one
 */
git.command('commit', function (e, message, amend) {
  var args = ['commit ', (amend ? '--amend ' : ''), '-m', '"' + message + '"'];
  _exec(e, args).pipe(sh.parsers.trim());
}, [_isInit, _isNotRebasing]);

/**
 * Get the git diff output of the given file.
 */
git.command('diff', function (e, file) {
  _exec(e, ['diff', 'HEAD', '--', file])
    .pipe(sh.parsers.trim())
    .pipe(parsers.diff());
}, [_isInit]);

/**
 * Stage the given file.
 */
git.command('stage', function (e, file) {
  _exec(e, ['add', '--all', '--', file]).pipe(sh.parsers.trim());
}, [_isInit]);

/**
 * Stage all files of the repository.
 */
git.command('stageall', function (e) {
  _exec(e, ['add', '--all', '.']).pipe(sh.parsers.trim());
}, [_isInit]);

/**
 * Unstage the given file.
 */
git.command('unstage', function (e, file) {
  _exec(e, ['reset', '--', file]).pipe(sh.parsers.trim());
}, [_isInit]);

/**
 * Unstage all the staged files.
 */
git.command('unstageall', function (e) {
  _exec(e, ['reset', '.']).pipe(sh.parsers.trim());
}, [_isInit]);

/**
 * Checkout files, branches or commits.
 */
git.command('checkout', function (e, sep, name) {
  if (name === undefined)
    name = sep;
  _exec(e, ['checkout', name]).pipe(sh.parsers.trim());
}, [_isInit]);

/**
 * Clean the repository.
 */
git.command('clean', function (e) {
  _exec(e, ['clean', '-fdx']).pipe(sh.parsers.trim());
}, [_isInit]);

/**
 * Fetch changes from the repository.
 */
git.command('fetch', function (e) {
  _exec(e, ['fetch']);
}, [_isInit, _isConnected, _isNotRebasing]);

/**
 * Rebase changes from the current branch. If already rebasing, you can specify
 * and option to do something related to the current rebase.
 *
 * @param {String} option the rebase option (skip, continue or abort)
 */
git.command('rebase', function (e, arg) {
  if (git.scope.rebasing === true) {
    if (['skip', 'abort', 'continue'].indexOf(arg) === -1)
      e.emit('fail', 'unknown rebase option --' + arg);
    else
      _exec(e, ['rebase', '--' + arg]);
  }
  else {
    if (arg === undefined)
      _exec(e, [
        'pull', '--rebase', git.scope.remote, git.scope.branches.current
      ]);
    else
      _exec(e, ['rebase', arg]);
  }
}, [_isInit, _isConnected]);

/**
 * Push changes to current branch's remote.
 */
git.command('push', function (e, force) {
  _exec(e, [
    'push', force ? '--force' : '',
    git.scope.remote, git.scope.branches.current
  ]);
}, [_isInit, _isConnected, _isNotRebasing]);

/**
 * Update the current branch from the given one.
 */
// git.task('update', function (task, branch) {
//   var br = this.scope.branches.current;
//   task.step(function () { git.exec('rebase'); })
//       .step(function () { git.exec('checkout', branch); })
//       .step(function () { git.exec('rebase'); })
//       .step(function () { git.exec('checkout', br); })
//       .step(function () { git.exec('rebase', branch); })
//       .step(function () { git.exec('push', true); });
// }, [_isNotRebasing, sh.Context.taskNotRunning('update')]);

// git.command('update', function (e, branch) {
//   var br = git.scope.branches.current;
//   git.exec('rebase');
//   git.exec('checkout', branch);
//   git.exec('rebase');
//   git.exec('checkout', br);
//   git.exec('rebase', branch);
//   git.exec('push', true);
// });

// git.task('sync').exec();

// git.command('sync', function (e, target, source) {
  // TODO (find a way to resume commands)
  // git pull --rebase origin br
  // git checkout develop
  // git pull --rebase origin develop
  // git checkout br
  // git rebase develop
  // git push --force origin br
// }, [_isInit, _isConnected, _isNotRebasing]);

// TODO
// create
// rebase
// push
// sync
// publish
// finish
// git diff --name-status HEAD 84879b69266db6d93be4ea7aef06c2e737f8ec95

/**
 * Export this context as a singleton.
 */
module.exports = git;
