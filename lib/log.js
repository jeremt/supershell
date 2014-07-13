
var EventEmitter = require('events').EventEmitter
  , sutil = require('./stringutils')

var LEVELS = {
  info: 0,
  warning: 1,
  error: 2
}

function Logger() {
  this.prompt = "[supershell][{level}] ";
  this.path = '/tmp/supershell.log';
  this.mode = 'none';
  this.level = 'info';
}

Logger.prototype.__proto__ = EventEmitter.prototype;

Logger.prototype.print = function (level, message) {
  if (LEVELS[this.level] < LEVELS[level])
    return ;
  if (this.mode === 'log')
    console.log(sutil.format(this.prompt, [], {
      level: level
    }) + message);
  else if (this.mode === 'event')
    this.emit('message', level, message);
  else if (this.mode === 'file')
    throw "TODO";
}

module.exports = new Logger;