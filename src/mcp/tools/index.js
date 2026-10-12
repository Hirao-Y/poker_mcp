// mcp/tools/index.js
import { bodyTools } from './bodyTools.js';
import { zoneTools } from './zoneTools.js';
import { transformTools } from './transformTools.js';
import { buildupFactorTools } from './buildupFactorTools.js';
import { sourceTools } from './sourceTools.js';
import { detectorTools } from './detectorTools.js';
import { commonTools } from './commonTools.js';
import { unitTools } from './unitTools.js';
import { thinnedIndicesTools } from './thinnedIndicesTools.js';
import { cadTools } from './cadTools.js';
import { calculationTools } from './calculationTools.js';
import { resetTools } from './resetTools.js';
import { daughterNuclideTools } from './daughterNuclideTools.js';
import { guiTools } from './guiTools.js';
import { schemaTools } from './schemaTools.js';
import { jobTools, withJobIdParam } from './jobTools.js';
import { isAsyncEnabled } from '../../utils/asyncConfig.js';
import { isGuiEnabled } from '../../utils/guiConfig.js';

// poker_openGui は、Windows で POKER.exe が見つかり、POKER_MCP_GUI=0 でないときだけ載せる
// （utils/guiConfig.js）。手元の Windows で POKER を入れている普段の環境では従来どおり載る。
const guiAvailable = isGuiEnabled();

const baseTools = [
  ...bodyTools,
  ...zoneTools,
  ...transformTools,
  ...buildupFactorTools,
  ...sourceTools,
  ...detectorTools,
  ...commonTools,
  ...unitTools,
  ...thinnedIndicesTools,
  ...cadTools,
  ...calculationTools,
  ...resetTools,
  ...daughterNuclideTools,
  ...(guiAvailable ? guiTools : []),
  ...schemaTools
];

// 非同期ジョブ（POKER_MCP_ASYNC=1）が有効なときだけ、ジョブ系の 3 ツールを加え、
// poker_getDoseMap に job_id 引数を足す。無効なときは baseTools をそのまま使い、
// ツール一覧は非同期ジョブを持たない版と変わらない。
export const allTools = isAsyncEnabled()
  ? [...baseTools.map((t) => (t.name === 'poker_getDoseMap' ? withJobIdParam(t) : t)), ...jobTools]
  : baseTools;

export {
  jobTools,
  bodyTools,
  zoneTools,
  transformTools,
  buildupFactorTools,
  sourceTools,
  detectorTools,
  commonTools,
  unitTools,
  thinnedIndicesTools,
  cadTools,
  calculationTools,
  resetTools,
  daughterNuclideTools,
  guiTools,
  schemaTools
};
