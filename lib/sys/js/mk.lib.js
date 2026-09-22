'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

function _isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function _error(message, status = 1) {
  const error = new Error(message);
  error.mkStatus = status;
  throw error;
}

function _writeError(message) {
  process.stderr.write(`mk: ${message}\n`);
}

function _validName(value) {
  return typeof value === 'string' && /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(value);
}

function _validEnvironmentName(value) {
  return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function _assertAllowedKeys(object, allowed, context) {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      _error(`${context}: unsupported member: ${key}`);
    }
  }
}

function _normalizeEnvironment(value, context) {
  if (value === undefined) {
    return {};
  }
  if (!_isObject(value)) {
    _error(`${context}: environment must be an object`);
  }
  const result = {};
  for (const key of Object.keys(value)) {
    if (!_validEnvironmentName(key) || typeof value[key] !== 'string') {
      _error(`${context}: invalid environment entry: ${key}`);
    }
    result[key] = value[key];
  }
  return result;
}

function _normalizeGoalMap(value, context) {
  if (value === undefined) {
    return {};
  }
  if (!_isObject(value)) {
    _error(`${context}: goals must be an object`);
  }
  const result = {};
  for (const name of Object.keys(value)) {
    if (!_validName(name)) {
      _error(`${context}: invalid goal name: ${name}`);
    }
    const roots = value[name];
    if (!Array.isArray(roots)) {
      _error(`${context}: goal ${name} must be an array`);
    }
    const normalized = [];
    for (const root of roots) {
      if (!_validName(root)) {
        _error(`${context}: goal ${name} has invalid root operation`);
      }
      normalized.push(root);
    }
    result[name] = normalized;
  }
  return result;
}

function _normalizeAction(value, context) {
  if (value === undefined) {
    return null;
  }
  if (!_isObject(value)) {
    _error(`${context}: action must be an object`);
  }
  _assertAllowedKeys(value, new Set(['type', 'command', 'args', 'cwd', 'env']), `${context}: action`);
  if (value.type !== 'process') {
    _error(`${context}: unsupported action type`);
  }
  if (typeof value.command !== 'string' || value.command.length === 0) {
    _error(`${context}: process command must be a non-empty string`);
  }
  const args = value.args === undefined ? [] : value.args;
  if (!Array.isArray(args)) {
    _error(`${context}: process args must be an array`);
  }
  const normalizedArgs = [];
  for (const argument of args) {
    if (typeof argument !== 'string') {
      _error(`${context}: process arguments must be strings`);
    }
    normalizedArgs.push(argument);
  }
  if (value.cwd !== undefined && (typeof value.cwd !== 'string' || value.cwd.length === 0)) {
    _error(`${context}: process cwd must be a non-empty string`);
  }
  return {
    type: 'process',
    command: value.command,
    args: normalizedArgs,
    cwd: value.cwd,
    env: _normalizeEnvironment(value.env, `${context}: action`)
  };
}

function _normalizeOperationMap(value, context) {
  if (value === undefined) {
    return {};
  }
  if (!_isObject(value)) {
    _error(`${context}: operations must be an object`);
  }
  const result = {};
  for (const name of Object.keys(value)) {
    if (!_validName(name)) {
      _error(`${context}: invalid operation name: ${name}`);
    }
    const operation = value[name];
    if (!_isObject(operation)) {
      _error(`${context}: operation ${name} must be an object`);
    }
    _assertAllowedKeys(operation, new Set(['prerequisites', 'action']), `${context}: operation ${name}`);
    const prerequisites = operation.prerequisites === undefined ? [] : operation.prerequisites;
    if (!Array.isArray(prerequisites)) {
      _error(`${context}: operation ${name} prerequisites must be an array`);
    }
    const normalizedPrerequisites = [];
    for (const prerequisite of prerequisites) {
      if (!_validName(prerequisite)) {
        _error(`${context}: operation ${name} has invalid prerequisite`);
      }
      normalizedPrerequisites.push(prerequisite);
    }
    result[name] = {
      prerequisites: normalizedPrerequisites,
      action: _normalizeAction(operation.action, `${context}: operation ${name}`)
    };
  }
  return result;
}

function _normalizeProfiles(value) {
  if (value === undefined) {
    return {};
  }
  if (!_isObject(value)) {
    _error('project: profiles must be an object');
  }
  const result = {};
  for (const name of Object.keys(value)) {
    if (!_validName(name)) {
      _error(`project: invalid profile name: ${name}`);
    }
    const profile = value[name];
    if (!_isObject(profile)) {
      _error(`project: profile ${name} must be an object`);
    }
    _assertAllowedKeys(profile, new Set(['environment', 'goals', 'operations']), `project: profile ${name}`);
    result[name] = {
      environment: _normalizeEnvironment(profile.environment, `project: profile ${name}`),
      goals: _normalizeGoalMap(profile.goals, `project: profile ${name}`),
      operations: _normalizeOperationMap(profile.operations, `project: profile ${name}`)
    };
  }
  return result;
}

function _loadProjectConfig(configPath) {
  let text;
  try {
    text = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    _error(`cannot read project configuration: ${configPath}`);
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    _error(`invalid JSON project configuration: ${configPath}`);
  }
  if (!_isObject(raw)) {
    _error('project configuration must be a JSON object');
  }
  _assertAllowedKeys(raw, new Set(['version', 'environment', 'goals', 'operations', 'profiles']), 'project');
  if (raw.version !== 1) {
    _error('project configuration version must be 1');
  }
  return {
    version: 1,
    environment: _normalizeEnvironment(raw.environment, 'project'),
    goals: _normalizeGoalMap(raw.goals, 'project'),
    operations: _normalizeOperationMap(raw.operations, 'project'),
    profiles: _normalizeProfiles(raw.profiles)
  };
}

function _selectModel(config, profileName) {
  const model = {
    environment: Object.assign({}, config.environment),
    goals: Object.assign({}, config.goals),
    operations: Object.assign({}, config.operations)
  };
  if (profileName === null) {
    return model;
  }
  if (!_validName(profileName)) {
    _error(`invalid profile name: ${profileName}`, 2);
  }
  const profile = config.profiles[profileName];
  if (profile === undefined) {
    _error(`unknown profile: ${profileName}`);
  }
  Object.assign(model.environment, profile.environment);
  Object.assign(model.goals, profile.goals);
  Object.assign(model.operations, profile.operations);
  return model;
}

function _validateReferences(model) {
  for (const goalName of Object.keys(model.goals)) {
    for (const root of model.goals[goalName]) {
      if (model.operations[root] === undefined) {
        _error(`goal ${goalName} references unknown operation: ${root}`);
      }
    }
  }
  for (const operationName of Object.keys(model.operations)) {
    for (const prerequisite of model.operations[operationName].prerequisites) {
      if (model.operations[prerequisite] === undefined) {
        _error(`operation ${operationName} references unknown prerequisite: ${prerequisite}`);
      }
    }
  }
}

function _parseCli(argv) {
  const request = {
    project: null,
    profile: null,
    plan: false,
    listGoals: false,
    showGoal: null,
    goals: []
  };
  let options = true;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (options && argument === '--') {
      options = false;
      continue;
    }
    if (options && argument === '--project') {
      index += 1;
      if (index >= argv.length) {
        _error('--project requires a pathname', 2);
      }
      request.project = argv[index];
      continue;
    }
    if (options && argument === '--profile') {
      index += 1;
      if (index >= argv.length) {
        _error('--profile requires a profile name', 2);
      }
      request.profile = argv[index];
      continue;
    }
    if (options && argument === '--plan') {
      request.plan = true;
      continue;
    }
    if (options && argument === '--goals') {
      request.listGoals = true;
      continue;
    }
    if (options && argument === '--show-goal') {
      index += 1;
      if (index >= argv.length) {
        _error('--show-goal requires a goal name', 2);
      }
      request.showGoal = argv[index];
      continue;
    }
    if (options && argument.startsWith('-')) {
      _error(`unknown option: ${argument}`, 2);
    }
    request.goals.push(argument);
  }
  if (request.profile !== null && !_validName(request.profile)) {
    _error(`invalid profile name: ${request.profile}`, 2);
  }
  if (request.showGoal !== null && !_validName(request.showGoal)) {
    _error(`invalid goal name: ${request.showGoal}`, 2);
  }
  for (const goal of request.goals) {
    if (!_validName(goal)) {
      _error(`invalid goal name: ${goal}`, 2);
    }
  }
  const introspectionCount = (request.listGoals ? 1 : 0) + (request.showGoal !== null ? 1 : 0);
  if (introspectionCount > 1 || (introspectionCount > 0 && request.plan)) {
    _error('incompatible introspection/execution options', 2);
  }
  if (introspectionCount > 0 && request.goals.length > 0) {
    _error('goal operands are not accepted with --goals or --show-goal', 2);
  }
  if (introspectionCount === 0 && request.goals.length === 0) {
    _error('at least one goal is required', 2);
  }
  return request;
}

function _discoverProject(explicitPath) {
  if (explicitPath !== null) {
    let root;
    try {
      root = fs.realpathSync(path.resolve(process.cwd(), explicitPath));
      if (!fs.statSync(root).isDirectory()) {
        _error(`project path is not a directory: ${explicitPath}`);
      }
    } catch (error) {
      if (error.mkStatus !== undefined) {
        throw error;
      }
      _error(`invalid project path: ${explicitPath}`);
    }
    const configPath = path.join(root, 'mk.json');
    try {
      if (!fs.statSync(configPath).isFile()) {
        _error(`project configuration is not a regular file: ${configPath}`);
      }
    } catch (error) {
      if (error.mkStatus !== undefined) {
        throw error;
      }
      _error(`project configuration not found: ${configPath}`);
    }
    return {root, configPath};
  }

  let current;
  try {
    current = fs.realpathSync(process.cwd());
  } catch (error) {
    _error('cannot resolve current working directory');
  }
  while (true) {
    const configPath = path.join(current, 'mk.json');
    try {
      if (fs.statSync(configPath).isFile()) {
        return {root: current, configPath};
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
        _error(`cannot inspect project configuration: ${configPath}`);
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  _error('project configuration mk.json not found');
}

function _plan(model, requestedGoals) {
  _validateReferences(model);
  const state = {};
  const stack = [];
  const plan = [];

  function _visit(operationName) {
    const currentState = state[operationName] || 0;
    if (currentState === 2) {
      return;
    }
    if (currentState === 1) {
      const cycle = stack.concat([operationName]).join(' -> ');
      _error(`operation prerequisite cycle: ${cycle}`);
    }
    state[operationName] = 1;
    stack.push(operationName);
    const operation = model.operations[operationName];
    for (const prerequisite of operation.prerequisites) {
      _visit(prerequisite);
    }
    stack.pop();
    state[operationName] = 2;
    plan.push(operationName);
  }

  for (const goalName of requestedGoals) {
    const roots = model.goals[goalName];
    if (roots === undefined) {
      _error(`unknown goal: ${goalName}`);
    }
    for (const root of roots) {
      _visit(root);
    }
  }
  return plan;
}

function _callerEnvironment() {
  const environment = Object.assign({}, process.env);
  if (environment.m_MK_CALLER_PATH !== undefined) {
    environment.PATH = environment.m_MK_CALLER_PATH;
  }
  if (environment.m_MK_CALLER_HOME_DEFINED === '1') {
    environment.HOME = environment.m_MK_CALLER_HOME || '';
  } else if (environment.m_MK_CALLER_HOME_DEFINED === '0') {
    delete environment.HOME;
  }
  delete environment.m_MK_CALLER_PATH;
  delete environment.m_MK_CALLER_HOME;
  delete environment.m_MK_CALLER_HOME_DEFINED;
  return environment;
}

function _applyEnvironment(target, overlay) {
  for (const key of Object.keys(overlay)) {
    target[key] = overlay[key];
  }
}

function _execute(projectRoot, model, plan) {
  const baseEnvironment = _callerEnvironment();
  _applyEnvironment(baseEnvironment, model.environment);

  for (const operationName of plan) {
    const action = model.operations[operationName].action;
    if (action === null) {
      continue;
    }
    let cwd = projectRoot;
    if (action.cwd !== undefined) {
      cwd = path.isAbsolute(action.cwd) ? action.cwd : path.resolve(projectRoot, action.cwd);
    }
    try {
      if (!fs.statSync(cwd).isDirectory()) {
        _error(`operation ${operationName}: cwd is not a directory: ${cwd}`);
      }
    } catch (error) {
      if (error.mkStatus !== undefined) {
        throw error;
      }
      _error(`operation ${operationName}: invalid cwd: ${cwd}`);
    }
    const environment = Object.assign({}, baseEnvironment);
    _applyEnvironment(environment, action.env);
    const result = childProcess.spawnSync(action.command, action.args, {
      cwd,
      env: environment,
      stdio: 'inherit',
      shell: false
    });
    if (result.error) {
      _error(`operation ${operationName}: cannot execute ${action.command}: ${result.error.message}`);
    }
    if (result.signal !== null) {
      _error(`operation ${operationName}: terminated by signal ${result.signal}`);
    }
    if (result.status !== 0) {
      _error(`operation ${operationName}: action failed with status ${result.status}`);
    }
  }
}

function mkMain(argv) {
  try {
    if (!Array.isArray(argv)) {
      _error('internal invocation requires an argument array', 2);
    }
    const request = _parseCli(argv);
    const project = _discoverProject(request.project);
    const config = _loadProjectConfig(project.configPath);
    const model = _selectModel(config, request.profile);
    _validateReferences(model);

    if (request.listGoals) {
      const names = Object.keys(model.goals).sort();
      if (names.length > 0) {
        process.stdout.write(`${names.join('\n')}\n`);
      }
      return 0;
    }

    if (request.showGoal !== null) {
      const roots = model.goals[request.showGoal];
      if (roots === undefined) {
        _error(`unknown goal: ${request.showGoal}`);
      }
      const plan = _plan(model, [request.showGoal]);
      process.stdout.write(`${JSON.stringify({goal: request.showGoal, roots, operations: plan}, null, 2)}\n`);
      return 0;
    }

    const plan = _plan(model, request.goals);
    if (request.plan) {
      if (plan.length > 0) {
        process.stdout.write(`${plan.join('\n')}\n`);
      }
      return 0;
    }

    _execute(project.root, model, plan);
    return 0;
  } catch (error) {
    _writeError(error && error.message ? error.message : 'unexpected failure');
    return error && Number.isInteger(error.mkStatus) ? error.mkStatus : 1;
  }
}

module.exports = {mkMain};
