SuperShell
==========

Simple utility to easily manipulate shell commands. The most important thing about this API is that is fully asynchronous and stream/events based.

It's very easy-to-use, but it also provides some powerful features.

```coffee
// it can be used very easily:
var cmd = sh('ls | wc -l');

// or if you prefere
var cmd = sh('ls').pipe('wc -l')

// and you can get the output through events:
cmd.on('finish', function (output, code) {
  console.log(code ? 'failed' : 'succeed', 'with output:', output);
});
```

Installation
------------

```
$ npm install supershell
```

Command
-------

The main supershell's feature is the command utiliy. It allow to easily chain commands though a simple asynchronous and chained js API.

### Methods

| Method | Description                                                       |
|--------|-------------------------------------------------------------------|
| pipe   | pipe the output of the command into another one, or into a parser |
| and    | execute the given command if the previous one succeed             |
| or     | execute the given command if the previous one failed              |
| then   | execute the given command anyway                                  |

### Events

| Name    | Description                                                      |
|---------|------------------------------------------------------------------|
| finish  | the command is finished                                          |
| success | the command is finished successfuly                              |
| fail    | the command has failed                                           |

### Examples

```js
var sh = require('supershell');

sh('ls', ['-l'])

  // if succeed then
  .and('echo', ['ls succeed!'])

  // trim the output
  .pipe(sh.parsers.trim())

  // catch the output on success
  .on('success', function (output, cmd) {
    console.log("command:", cmd);
    console.log("output:", output);
  });

// Test with errors
sh('ls file_not_found')

  .pipe(sh.parsers.trim())

  // wont be triggered
  .on('success', function (output) {
    console.log('never called');
  })

  // will be triggered
  .on('fail', function (output, name, code) {
    console.log('fail: ', name, code, output);
  })

  // will be triggered
  .on('finish', function (output, name, code) {
    console.log('finish: ', name, code, output);
  })

  .or(new sh.Command('ls').pipe(sh.parsers.list()))

  .on('success', function (output) {
    console.log('files: ', output);
  });
```

### Create a parser

You can easily create your own parser as a closure or a simple function callback:
```js
// create parsers

function upperCase(output) {
  return output.toUpperCase();
}

function replace(source, dest) {
  return function (output) {
    return output.replace(source, dest);
  }
}

// use it
var sh = require('supershell');

sh('ls')
  .pipe(upperCase)
  .pipe(replace('a', 'b'))
  .on('success', function (output) {
    console.log(output);
  });
```

History
-------

An history of your commands will be saved within `supershell` module. You can access it through the config that way:

```js
var sh = require('supershell');

sh('ls').on('success', function () {
  // print the current history
  console.log(sh.config.history);
  // clean the history
  console.log(sh.config.cleanHistory());
});
```

Alias
-----

SuperShell provides a tool to register and use aliases on shell commands.

```js
var sh = require('supershell');

// register your alias via `setAlias` method
sh.config.setAlias('lsHidden', 'ls', ['-a']);
sh.config.setAlias('lsFull', sh.cmd('ls', ['-l']));

// then use it like any other command
sh('lsHidden').on('success', function (output) {
    console.assert(output.indexOf('..') !== -1);
});

// or
sh('lsFull').pipe(sh.parsers.list()).on('success', function (output) {
  console.log(output);
});

// even add custom parameters
sh('lsHidden', ['-l']).on('success', function (output) {
    console.assert(output.indexOf('..') !== -1);
});
```

Context
-------

A `Context` instance is an object which has its own scope and commands. It's useful if you want to gather commands which are related. It also allow to easily refresh scope from commands or execute commands under specific conditions (for a real use case, look at `lib/context/git/index.js`).

Simple example:

```js
var sh = require('supershell');

// Define your context
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

// Use it:

workspace.on('refresh', function () {
  console.log('Refresh workspace...');
});

workspace.refresh(0.5, 'list');

workspace.exec('create', 'test')
  .on('success', function () {
    console.log('Create ok.');
  })
  .on('fail', function (output) {
    console.log('failed: ' + output);
  });

```

TODO
----

- handle pipes in json serialization
- on progress event.
- globing
- env
- scripts
- redirection << >> < >
- cd command
- exists command