
var EventEmitter = require('events').EventEmitter;

function Context() {
  this.scope = {};
  this._commands = {};
}

Context.prototype.__proto__ = EventEmitter.prototype;

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
    });
    process.nextTick(function () {
      fn.apply(_this, [emitter].concat(args));
    });
    return emitter;
  }
  return this;
}

Context.prototype.exec = function (name) {
  return this._commands[name](Array.prototype.slice.call(arguments, 1));
}

module.exports = Context;