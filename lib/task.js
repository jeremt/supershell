
function Task(name) {
  this.name = name;
  this._steps = [];
  this._runningSteps = [];
}

/**
 * Append a step to the task's steps.
 */
Task.prototype.step = function (fn) {
  this._steps.push(fn);
  return this;
}

/**
 * Execute the task, from the current step.
 */
Task.prototype.exec = function () {
  this._runningSteps = this._steps;
  return this;
}

Task.prototype.next = function () {
  this._runningSteps.shift().call(this);
  return this;
}

var task = new Task('sync');

task.step(function () {
  var _this = this;
  sh('git', ['checkout', 'develop']).on('success', function () {
    _this.next();
  });
});