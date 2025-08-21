// mcp/tools/index.js
import { bodyTools } from './bodyTools.js';
import { zoneTools } from './zoneTools.js';
import { transformTools } from './transformTools.js';
import { buildupFactorTools } from './buildupFactorTools.js';
import { sourceTools } from './sourceTools.js';
import { commonTools } from './commonTools.js';

export const allTools = [
  ...bodyTools,
  ...zoneTools,
  ...transformTools,
  ...buildupFactorTools,
  ...sourceTools,
  ...commonTools
];

export {
  bodyTools,
  zoneTools,
  transformTools,
  buildupFactorTools,
  sourceTools,
  commonTools
};
