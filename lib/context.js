
var EventEmitter = require('events').EventEmitter;

function Context() {
  this.scope = {};
  this.ordered = false;
  this._commands = {};
  this._beforeFn = [];
  this._queue = [];
}

Context.prototype.__proto__ = EventEmitter.prototype;

Context.prototype.before = function (fn) {
  this._beforeFn.push(fn);
}

Context.prototype.refresh = function (delay, fn) {
  var _this = this;
  fn.apply(this);
  setInterval(function () {
    fn.apply(_this);
  }, delay);
  return this;
}

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

Context.prototype.exec = function (name) {
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

module.exports = Context;