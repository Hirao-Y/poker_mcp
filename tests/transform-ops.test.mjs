// [追加 2026-11-27] POKER 2.3.4 の transform の操作（TransformValidator.validateTransformOperations）の試験
//   使い方: node tests/transform-ops.test.mjs
import { TransformValidator } from '../src/validators/TransformValidator.js';

let failures = 0, n = 0;
const ok = (label, ops) => { n++; try { TransformValidator.validateTransformOperations(ops); } catch (e) { failures++; console.log(`NG（通るはず）${label}: ${e.message}`); } };
const ng = (label, ops, re) => {
  n++;
  try { TransformValidator.validateTransformOperations(ops); failures++; console.log(`NG（止まるはず）${label}`); }
  catch (e) { if (re && !re.test(e.message)) { failures++; console.log(`NG（文言）${label}: ${e.message}`); } }
};

ok('z 周りの角度', [{ rotate_around_z: 90 }]);
ok('x 周り＋中心', [{ rotate_around_x: { angle: 30, center: '0 0 100' } }]);
ok('任意の軸＋中心', [{ rotate_by_axis_angle: { axis: '1 1 0', angle: 45, center: '1 2 3' } }]);
ok('オイラー角（大文字の並びも可）', [{ rotate_by_euler: { sequence: 'ZYX', angles: '10 20 30', frame: 'extrinsic' } }]);
ok('ロール・ピッチ・ヨー', [{ rotate_by_rpy: { roll: 15, pitch: -25, yaw: 35, center: '5 6 7' } }]);
ok('回転行列', [{ rotate_by_matrix: { row_1: '0 -1 0', row_2: '1 0 0', row_3: '0 0 1' } }]);
ok('並べた操作', [{ translate: '0 0 10' }, { rotate_around_y: -45.5 }, { rotate_by_matrix: { row_1: '0.8 0.6 0', row_2: '-0.6 0.8 0', row_3: '0 0 1', center: '5 5 0' } }]);
ng('鏡映の行列', [{ rotate_by_matrix: { row_1: '1 0 0', row_2: '0 1 0', row_3: '0 0 -1' } }], /determinant/);
ng('長さが 1 でない行', [{ rotate_by_matrix: { row_1: '2 0 0', row_2: '0 1 0', row_3: '0 0 1' } }], /length/);
ng('直交しない行', [{ rotate_by_matrix: { row_1: '1 0 0', row_2: '0.5 0.866 0', row_3: '0 0 1' } }], /orthogonal/);
ng('使えない軸の並び', [{ rotate_by_euler: { sequence: 'xxy', angles: '1 2 3', frame: 'intrinsic' } }], /sequence/);
ng('frame が無い', [{ rotate_by_euler: { sequence: 'zyx', angles: '1 2 3' } }], /frame/);
ng('frame の値', [{ rotate_by_euler: { sequence: 'zyx', angles: '1 2 3', frame: 'body' } }], /frame/);
ng('旧 rotate_by_rpy（3 値）', [{ rotate_by_rpy: '10 20 30' }], /object/);
ng('旧 rotate_by_eulerzxz', [{ rotate_by_eulerzxz: '10 20 30' }], /Invalid operation type/);
ng('yaw が無い', [{ rotate_by_rpy: { roll: 1, pitch: 2 } }], /yaw/);
ng('知らないキー', [{ rotate_around_x: { angel: 90 } }], /unknown key/);
ng('中心が 2 つの数', [{ rotate_around_x: { angle: 90, center: '1 2' } }], /x y z/);
ng('軸がゼロ', [{ rotate_by_axis_angle: { axis: '0 0 0', angle: 30 } }], /zero/);
ng('キーが 2 つ', [{ translate: '0 0 1', rotate_around_z: 9 }], /exactly one key/);
{
  n++;
  const r = TransformValidator.validateTransformPhysics([{ rotate_around_z: { angle: 90, center: '1 0 0' } }], 't');
  if (!(r.hasRotation && r.hasTranslation && r.totalRotationMagnitude === 90)) { failures++; console.log('NG 物理チェック（中心つきの回転は位置も動かす）', r); }
}
console.log(failures ? `\n${failures} 件失敗` : `\nすべて成功（${n} 件）`);
process.exit(failures ? 1 : 0);
