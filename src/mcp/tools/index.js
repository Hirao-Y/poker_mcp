// mcp/tools/index.js
import { bodyTools } from './bodyTools.js';
import { zoneTools } from './zoneTools.js';
import { transformTools } from './transformTools.js';
import { buildupFactorTools } from './buildupFactorTools.js';
import { sourceTools } from './sourceTools.js';
import { detectorTools } from './detectorTools.js';
import { commonTools } from './commonTools.js';
import { unitTools } from './unitTools.js';
import { calculationTools } from './calculationTools.js';

export const allTools = [
  ...bodyTools,
  ...zoneTools,
  ...transformTools,
  ...buildupFactorTools,
  ...sourceTools,
  ...detectorTools,
  ...commonTools,
  ...unitTools,
  ...calculationTools
];

export {
  bodyTools,
  zoneTools,
  transformTools,
  buildupFactorTools,
  sourceTools,
  detectorTools,
  commonTools,
  unitTools,
  calculationTools
};
