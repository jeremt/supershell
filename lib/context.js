
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

/**
 * Register some commands to refresh with the given interval.
 *
 * @param {Number} delay between each refresh (in seconds)
 * @param {String|Array<String>} commands the command or commands to register
 */
Context.prototype.refresh = function (delay, commands) {
  if (commands.constructor.name !== "Array")
    commands = [commands];
  var _this = this
    , args = Array.prototype.slice.call(arguments, 2);
  this._execCommands(commands, args);
  setInterval(function () {
    _this._execCommands(commands, args);
  }, delay * 1000.0);
  return this;
}

/**
 * Add a command into the context.
 *
 * @param {String} name the name of the command
 * @param {Function} fn the function which describes the command
 */
Context.prototype.command = function (name, fn) {
  var _this = this;
  this._commands[name] = function (args) {
    var emitter = new EventEmitter;
    emitter.on('fail', function (output) {
      _this.emit('error', output, name);
      emitter.emit('finish');
    });
    emitter.on('success', function (output) {
      emitter.emit('finish');
    });
    return {
      exec: function () {
        process.nextTick(function () {
          for (var i in _this._beforeFn)
            if (!_this._beforeFn[i].call(_this, emitter, name))
              return ;
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

  if (this._commands[name] === undefined)
    throw new Error('Unknown command ' + name + ' in ' +
                    this.constructor.name + ' context.');

  var _this = this
    , args = Array.prototype.slice.call(arguments, 1)
    , cmd = this._commands[name](args);

  if (this.ordered) {
    this._queue.push(cmd);
    cmd.emitter.on('finish', function () {
      _this._queue.shift();
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
    this.exec.apply(this, [commands[i]].concat(args));
  _this.emit('refresh');
}

module.exports = Context;