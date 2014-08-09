
var EventEmitter = require('events').EventEmitter;

/**
 * Create a `Context` instance.
 */
function Context() {
  this.scope = {};
  this.ordered = false;
  this._commands = {};
  this._beforeFn = [];
  this._queue = [];
  this._refreshCommands = [];
}

/**
 * Inherit from `EventEmitter`.
 */
Context.prototype.__proto__ = EventEmitter.prototype;

/**
 * Add the given callback to a list to execute before executing each command.
 * If at least one of theses callbacks return false, the command won't be
 * executed.
 */
Context.prototype.before = function (fn) {
  this._beforeFn.push(fn);
}

Context.prototype.clear = function () {
  this._queue = [];
}

/**
 * Register some commands to refresh with the given interval.
 *
 * @param {Number} delay between each refresh (in seconds)
 * @param {String|Array<String>} commands the command or commands to register
 */
Context.prototype.refresh = function (delay, commands) {

  // refresh all the commands if no arguments
  if (delay === undefined) {
    for (var i in this._refreshCommands)
      this._refreshCommands[i]();
    return this;
  }

  // otherwise, register the commands to refresh
  if (commands.constructor.name !== "Array")
    commands = [commands];
  var _this = this;
  this._refreshCommands.push(function () {
    _this._execCommands(commands);
  });
  setInterval(function () {
    _this._execCommands(commands);
  }, delay * 1000.0);
  return this;
}

/**
 * Add a command into the context.
 *
 * @param {String} name the name of the command
 * @param {Function} fn the function which describes the command
 * @param {Array<Function>} validators to check stuffs before execution
 */
Context.prototype.command = function (name, fn, validators) {
  var _this = this;
  validators = validators || [];
  this._commands[name] = function (args) {
    var emitter = new EventEmitter;
    emitter.on('fail', function (output) {
      _this.emit('fail', output, name);
      emitter.emit('finish');
    });
    emitter.on('success', function (output) {
      emitter.emit('finish');
    });
    return {
      name: name,
      exec: function () {
        process.nextTick(function () {
          for (var i in _this._beforeFn)
            if (!_this._beforeFn[i].call(_this, emitter, name))
              return emitter;
          for (var i in validators)
            if (!validators[i].call(_this, emitter))
              return emitter;
          fn.apply(_this, [emitter].concat(args));
        });
        return emitter;
      },
      emitter: emitter
    };
  }
  return this;
}

/**
 * Execute a command.
 *
 * @param {String} name the name of the command to execute
 */
Context.prototype.exec = function (name) {
  var _this = this;

  if (this._commands[name] === undefined) {
    var emitter = new EventEmitter();
    emitter.on('fail', function (message) {
      _this.emit('fail', message);
    });
    process.nextTick(function () {
      emitter.emit('fail', 'unknown command `' + name + '`.');
    });
    return emitter;
  }

  var args = Array.prototype.slice.call(arguments, 1)
    , cmd = this._commands[name](args)
    , hash = name + args.join(" ")

  // Abort the command if already running and do nothing.
  //
  // This is useful if you are trying to run the same command to much time
  // (in a short refresh for instance).
  // However, I'm not sure that's the best way to fix it, that why any other
  // idea is welcomed :)
  //
  for (var i in this._queue) {
    if (this._queue[i].hash == hash) {
      // process.nextTick(function () {
      //   cmd.emitter.emit("fail", "command " + name + " already running...");
      // });
      return cmd.emitter;
    }
  }
  cmd.hash = hash;

  if (this.ordered) {
    this._queue.push(cmd);
    cmd.emitter.on('finish', function () {

      // remote the command which has just finished from the queue
      _this._queue.shift();

      // auto refresh command (the commands which are already in the queue are
      // not readded), so we can run refresh even on commands inside refresh.
      _this.refresh();

      // exec the next command
      if (_this._queue.length > 0)
        _this._queue[0].exec();
    });
    if (this._queue.length === 1)
      cmd.exec();
    return cmd.emitter;
  }
  return cmd.exec();
}

Context.prototype._execInRefresh = function (name) {

  if (this._commands[name] === undefined)
    throw new Error('unknown command ' + name + ' in ' +
                    this.constructor.name + ' context.');

  var _this = this
    , cmd = this._commands[name]()
    , hash = "refresh:" + name;

  // Abort the command if already running and do nothing.
  //
  // This is useful if you are trying to run the same command to much time
  // (in a short refresh for instance).
  // However, I'm not sure that's the best way to fix it, that why any other
  // idea is welcomed :)
  //
  for (var i in this._queue) {
    if (this._queue[i].hash == hash) {
      // process.nextTick(function () {
      //   cmd.emitter.emit("fail", "command " + name + " already running...");
      // });
      return cmd.emitter;
    }
  }
  cmd.hash = hash;

  if (this.ordered) {
    this._queue.push(cmd);
    cmd.emitter.on('finish', function () {

      // remote the command which has just finished from the queue
      _this._queue.shift();

      // exec the next command
      if (_this._queue.length > 0)
        _this._queue[0].exec();
    });
    if (this._queue.length === 1)
      cmd.exec();
    return cmd.emitter;
  }
  return cmd.exec();
}

Context.prototype._execCommands = function (commands, args) {
  var _this = this;
  for (var i in commands)
    this._execInRefresh.apply(this, [commands[i]].concat(args));
  _this.emit('refresh');
}

module.exports = Context;