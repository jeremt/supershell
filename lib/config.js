
/**
 * Alias
 */
exports.alias = {};
exports.setAlias = function (name, cmd, args) {
  if (cmd.constructor.name === 'Command')
    exports.alias[name] = cmd.toJson();
  else
    exports.alias[name] = {cmd: cmd, args: args};
};

/**
 * History
 */
exports.history = [];
exports.cleanHistory = function () {
  exports.history = [];
};

/**
 * Scope
 */
exports.scope = {};

/**
 * Scripts
 */
exports.scripts = {};
exports.addScript = function (name, script) {
  exports.scripts[name] = script;
}

/**
 * Load config.
 */
exports.load = function (cfg) {
  exports.alias = cfg.alias;
  exports.history = cfg.history;
  exports.scope = cfg.scope;
  exports.scripts = cfg.scripts;
};