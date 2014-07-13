
/**
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter
  , exec = require('child_process').exec
  , sutil = require('./stringutils')
  , log = require('./log')
  , config = require('./config');

/**
 * Provide an easy way to chain commands asynchronously. It also allows to
 * parse the output into the appropriate format.
 *
 * @param cmd {String} the command name
 * @param args {String} the arguments to give to the command
 *
 */
function Command(cmd, args) {
  if (cmd === undefined)
    throw new Error('Cannot run command without its name!');
  this.state = 'pending';
  this.previous = null;
  this._cmd = cmd;
  this._args = args || [];
  this._andCommand = null;
  this._orCommand = null;
  this._thenCommand = null;
  this._pipeFunctions = [];
  this._pipeCmds = [];

  this.__defineGetter__('root', function () {
    var root = this;
    while (root.previous !== null)
      root = root.previous;
    return root;
  });

}

/**
 * Inherit from `EventEmitter`.
 */
Command.prototype.__proto__ = EventEmitter.prototype;

/**
 * Run the command registered in the current Command.
 */
Command.prototype.exec = function () {
  var _this = this;
  var output = '';

  if (this.state !== 'pending')
    return this;

  process.nextTick(function () {
    _this.state = 'running';

    // unserialize command
    if (config.alias[_this._cmd] !== undefined) {
      _this.fromJson(config.alias[_this._cmd]);
    }

    _this._result = exec(_this.toString());

    // save a timestamp of when the command started.
    var timestamp = new Date().toString();

    // save output data
    _this._result.stdout.on('data', function (data) {
      output += data;
    });
    _this._result.stderr.on('data', function (data) {
      output += data;
    });

    _this._result.on('close', function (code) {
      _this.state = 'done';

      // exec pipes
      var finalOutput = output;
      for (var i = 0; i < _this._pipeFunctions.length; ++i)
        finalOutput = _this._pipeFunctions[i](finalOutput, code);
      _this.emit('finish', finalOutput, _this._cmd, code);

      // save history
      if (_this.previous === null)
        config.history.unshift({timestamp: timestamp, command: _this.toJson()});

      // handle failed commands
      if (code) {
        _this.emit('fail', finalOutput, _this._cmd, code);
        if (_this._orCommand)
          return _this._orCommand.exec();
        else if (_this._thenCommand)
          return _this._thenCommand.exec();
      } // handle success
      else {
        _this.emit('success', finalOutput, _this._cmd);
        if (_this._andCommand)
          return _this._andCommand.exec();
        else if (_this._thenCommand)
          return _this._thenCommand.exec();
      }
    });
  });
  return this;
}

/**
 * Add a command to chain if this command succeed.
 */
Command.prototype.and = function (cmd, args, kw) {
  if (cmd instanceof Command)
    this._andCommand = cmd;
  else
    this._andCommand = new Command(cmd, args, kw);
  this._andCommand.previous = this;
  if (this.state === 'done')
    this._andCommand.run();
  return this._andCommand;
}

/**
 * Add a command to chain if this command failed.
 */
Command.prototype.or = function (cmd, args, kw) {
  if (cmd instanceof Command)
    this._orCommand = cmd;
  else
    this._orCommand = new Command(cmd, args, kw);
  this._orCommand.previous = this;
  if (this.state === 'done')
    this._orCommand.run();
  return this._orCommand;
}

/**
 * Add a command to chain anyway.
 */
Command.prototype.then = function (cmd, args, kw) {
  if (cmd instanceof Command)
    this._thenCommand = cmd;
  else
    this._thenCommand = new Command(cmd, args, kw);
  this._thenCommand.previous = this;
  if (this.state === 'done')
    this._thenCommand.run();
  return this._thenCommand;
}

/**
 * Abort the current command.
 */
Command.prototype.abort = function () {
  if (this.state === 'running') {
    this._result.kill();
    this.state = 'aborted';
  }
  return this;
}

/**
 * Serialize this command to json.
 */
Command.prototype.toJson = function () {
  return {
    cmd: this._cmd,
    args: this._args,
    and: this._andCommand ? this._andCommand.toJson() : null,
    or: this._orCommand ? this._orCommand.toJson() : null,
    then: this._thenCommand ? this._thenCommand.toJson() : null,
  }
}

/**
 * Unserialize the commnad from a json object.
 */
Command.prototype.fromJson = function (data) {
  this._cmd = data.cmd;
  this._args = this._args ? this._args.concat(data.args) : data.args;
  this._andCommand = data.and ? new Command().fromJson(data.and) : null;
  this._orCommand = data.or ? new Command().fromJson(data.or) : null;
  this._thenCommand = data.then ? new Command().fromJson(data.then) : null;
}

Command.prototype.toString = function (data) {
  var base = sutil.split(this._cmd);
  var args = base.slice(1).concat(this._args || []);
  return base[0] + " "
   + (args ? sutil.format(args.join(" "), [], config.scope) : "")
   + this._pipeCmds.map(function (cmd) {return " |" + cmd.toString()}).join("");
 // + this._andCommand.map(function (cmd) {return " &&" + cmd.toString()});
}

/**
 * Pipe another command on the result of the previous one.
 */
Command.prototype.pipe = function (cmd, args) {
  if (cmd.constructor.name === 'Function') {
    if (this.state === 'done')
      log.emit('error', 'Already done so your pipe won\'t be applied.')
    else
      this._pipeFunctions.push(cmd);
  }
  else {
    if (this.state === 'running' || this.state === 'done')
      log.emit('error', 'Already running so your pipe won\'t be applied.');
    else if (cmd.constructor.name === 'Command')
      this._pipeCmds.push(cmd);
    else
      this._pipeCmds.push(new Command(cmd, args));
  }
  return this;
}

/**
 * Export Command.
 */
exports.cmd = function (name, args) {
  return new Command(name, args);
}

exports.exec = function (name, args) {
  return new Command(name, args).exec();
}
