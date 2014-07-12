SuperShell
==========

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

sh.exec('ls', ['-l'])

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
sh.exec('ls file_not_found')

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

sh.exec('ls')
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

sh.exec('ls').on('success', function () {
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

// then use it like any other command
sh.exec('lsHidden').on('success', function (output) {
    console.assert(output.indexOf('..') !== -1);
});

// even add custom parameters
sh.exec('lsHidden', ['-l']).on('success', function (output) {
    console.assert(output.indexOf('..') !== -1);
});
```

TODO
----

- handle pipes in json serialization
- on progress event.
- globing
- queue
- env
- scripts
- redirection << >> < >