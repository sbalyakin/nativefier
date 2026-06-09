import type { Argv } from 'yargs';

type YargsFactory = (argv?: readonly string[]) => Argv;

// yargs 18 is ESM-only. Node CJS `require` often returns the factory function;
// Jest VM modules return a namespace object with the factory on `.default`.
const yargsModule = require('yargs/yargs') as
  | YargsFactory
  | { default: YargsFactory };

const yargsFactory: YargsFactory =
  typeof yargsModule === 'function' ? yargsModule : yargsModule.default;

export default yargsFactory;
