console.log("start");
import fs from 'fs';
import yaml from 'js-yaml';
import express from 'express';

class TaskManager {
  constructor(yamlFile, pendingFile) {
    this.yamlFile = yamlFile;
    this.pendingFile = pendingFile;
    this.data = yaml.load(fs.readFileSync(yamlFile, 'utf8'));
    this.pendingChanges = JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
  }

  findBodyByName(name, bodies) {
    for (const body of bodies) {
      if (body.name === name) return body;
    }
    return null;
  }

  findBodyByType(type, bodies) {
    const bodytmp = [];
    for (const body of bodies) {
      if (body.type === type) bodytmp.push(body);
    }
    if(bodytmp.length > 0) return bodytmp; else return null;
  } 

  findZoneByBodyName(name, zones) {
    for (const zone of zones) {
      if (zone.body_name === name) return zone;
    }
    return null;
  }

  findZoneByMaterial(material, zones) {
    const zonetmp = [];
    for (const zone of zones) {
      if (zone.material === material) zonetmp.push(zone);
    }
    if(zonetmp.length > 0) return zonetmp; else return null;
  }

  proposeZone(body_name, material, density) {
    // 材料ごとのデフォルト密度
    const defaultDensities = {
      'Concrete': 2.1,
      'Iron': 7.8,
      'Lead': 11,
      'Polyethylene': 0.92,
      'Air': 0.001205,
      'Carbon': 2.2,
      'Water': 1,
      'AcrylicResin': 1.19,
      'Aluminium': 2.7,
      'Copper': 8.9,
      'Tungsten': 19,
      'PyrexGlass': 2.23,
      'Soil': 1.5,
      'Concrete_Si': 2.156,
      'Concrete_Ca': 2.156,
      'Heavy_concrete_T': 3.86,
      'Heavy_concrete_FP': 4.8,
      'Heavy_concrete_IL': 4.4,
      'SUS_A': 7.8,
      'SUS_B': 7.7,
      'Cast_Iron': 7,
      'Epoxy_Resin': 1.25,
      'Zirc-4': 6.5,
      'Source_Dry': 1.97,
      'Cast_Iron_PIE': 7.0953
    };
    if (material in defaultDensities && (density === undefined || density === null)) {
      density = defaultDensities[material];
    }
    // body_nameバリデーション
    if (body_name !== 'ATMOSPHERE') {
      const bodyNames = this.data.body.map(b => b.name);
      if (!bodyNames.includes(body_name)) {
        throw new Error('body_nameは既存の立体名のみ許可されています（ATMOSPHEREを除く）');
      }
    }
    // densityバリデーション
    if (density !== undefined) {
      if (typeof density !== 'number' && (typeof density !== 'string' || isNaN(Number(density)))) {
        throw new Error('densityは数値で指定してください');
      }
      const numVal = Number(density);
      if (!(numVal > 0)) {
        throw new Error('densityは0を超える数値で指定してください');
      }
    }
    // ATMOSPHEREゾーンは必ず一つのみ許可
    if (body_name === 'ATMOSPHERE') {
      const exists = this.data.zone.some(z => z.body_name === 'ATMOSPHERE');
      if (exists) throw new Error('ATMOSPHEREゾーンは既に存在しています');
    }
    // 既存のゾーンでbody_nameもmaterialも一致するものがあればエラー
    const duplicateZone = this.data.zone.find(z => z.body_name === body_name && z.material === material);
    if (duplicateZone) throw new Error(`ゾーン ${body_name}（材料: ${material}）は既に定義済みです`);
    // body_name重複チェック
    const sameNameZone = this.data.zone.find(z => z.body_name === body_name);
    if (sameNameZone) throw new Error(`ゾーン ${body_name} は既に存在します`);
    let newZoneName;
    if(body_name) newZoneName = body_name; 
    else newZoneName = `zon${(this.data.zone.flatMap(t => [t, ...(t.zone || [])]).length + 1)}`;
    let newZone;
    if(material === "void" || material === "VOID") {
      material = "VOID";
      newZone = { body_name: newZoneName, material: material};
    } else {
      newZone = { body_name: newZoneName, material: material, density: density };
    }
    this.pendingChanges.push({ action: "add_zone", zone: newZone });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: ゾーン ${newZoneName} を追加`;
  }

  proposeBody(name, type, options = {}) {
    // 許可されたtypeのみ
    const allowedTypes = ['BOX', 'RPP', 'RCC', 'SPH', 'WED', 'TOR', 'ELL', 'REC', 'TRC', 'CMB'];
    if (!allowedTypes.includes(type)) {
      throw new Error(`typeは${allowedTypes.join(', ')}のみ許可されています`);
    }
    // radius系のバリデーション
    const radiusKeys = ['radius', 'major_radius', 'minor_radius', 'bottom_radius', 'top_radius'];
    for (const key of radiusKeys) {
      if (options[key] !== undefined) {
        const val = options[key];
        if (typeof val !== 'number' && (typeof val !== 'string' || isNaN(Number(val)))) {
          throw new Error(`${key}は数値で指定してください`);
        }
        const numVal = Number(val);
        if (!(numVal > 0)) {
          throw new Error(`${key}は0を超える数値で指定してください`);
        }
      }
    }
    // expression以外のベクトルバリデーション
    for (const key of Object.keys(options)) {
      if (key === 'expression') continue;
      if (radiusKeys.includes(key)) continue;
      const val = options[key];
      if (typeof val === 'string') {
        const parts = val.trim().split(/\s+/);
        if (parts.length !== 3 || !parts.every(x => !isNaN(Number(x)))) {
          throw new Error(`${key}は3つの数字（空白区切りのベクトル）で指定してください`);
        }
      }
    }
    const myBody = this.findBodyByName(name, this.data.body);
    if (myBody) throw new Error(`立体 ${name} は既に定義済みです`);
    let newBodyName;
    if(name) newBodyName = name;
    else newBodyName = `bod${(this.data.body.flatMap(t => [t, ...(t.body || [])]).length + 1)}`;
    let newType;
    if(type) newType = type;
    else newType = "BOX";
    let newBody;
    switch(newType) {
      case "BOX":
        if(options.vertex && options.edge_1 && options.edge_2 && options.edge_3) {
          newBody = { name: newBodyName, type: newType, vertex: options.vertex, edge_1: options.edge_1, edge_2: options.edge_2, edge_3: options.edge_3 };
        } else {
          throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
        }
        break;
      case "RPP":
        if(options.min && options.max) {
          newBody = { name: newBodyName, type: newType, min: options.min, max: options.max };
        } else {
          throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
        }
        break;
        case "RCC":
          if(options.bottom_center && options.height_vector && options.radius) {
            newBody = { name: newBodyName, type: newType, bottom_center: options.bottom_center, height_vector: options.height_vector, radius: options.radius };
          } else {
            throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
          }
          break;
        case "WED":
          if(options.vertex && options.width_vector && options.height_vector && options.depth_vector) {
            newBody = { name: newBodyName, type: newType, vertex: options.vertex, width_vector: options.width_vector, height_vector: options.height_vector, depth_vector: options.depth_vector };
          } else {
            throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
          }
          break;
        case "SPH":
          if(options.center && options.radius) {
            newBody = { name: newBodyName, type: newType, center: options.center, radius: options.radius };
          } else {
            throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
          }
          break;
        case "TOR": 
          if(options.center && options.normal && options.major_radius && options.minor_radius) {
            newBody = { name: newBodyName, type: newType, center: options.center, normal: options.normal, major_radius: options.major_radius, minor_radius: options.minor_radius };
          } else {
            throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
          }
          break;
        case "ELL":
          if(options.center && options.radius_vector_1 && options.radius_vector_2 && options.radius_vector_3) {
            newBody = { name: newBodyName, type: newType, center: options.center, radius_vector_1: options.radius_vector_1, radius_vector_2: options.radius_vector_2, radius_vector_3: options.radius_vector_3 };
          } else {
            throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
          }
          break;
        case "REC":
          if(options.bottom_center && options.height_vector && options.radius_vector_1 && options.radius_vector_2) {
            newBody = { name: newBodyName, type: newType, bottom_center: options.bottom_center, height_vector: options.height_vector, radius_vector_1: options.radius_vector_1, radius_vector_2: options.radius_vector_2 };
          } else {
            throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
          }
          break;
        case "TRC":
          if(options.bottom_center && options.height_vector && options.bottom_radius && options.top_radius) {
            newBody = { name: newBodyName, type: newType, bottom_center: options.bottom_center, height_vector: options.height_vector, bottom_radius: options.bottom_radius, top_radius: options.top_radius };
          } else {
            throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
          }
          break;
        case "CMB":
          if(options.expression) {
            newBody = { name: newBodyName, type: newType, expression: options.expression };
          } else {
            throw new Error(`立体 ${newBodyName}:${newType} の定義に必要なパラメータが不足しています`);
          }
          break;
     }
     // transform名バリデーション追加
     if(options.transform) {
       // transformリスト取得
       const transformList = (this.data.transform || []).map(t => t.name);
       if (!transformList.includes(options.transform)) {
         throw new Error(`transform属性はtransformノードで定義された名前のみ許可されています: ${transformList.join(', ')}`);
       }
       newBody.transform = options.transform;
     }

    // const subtaskAttr = {
    //   depends_on: options.depends_on || null,
    //   parallel: options.parallel || false,
    //   loop: options.loop || false,
    //   design: options.design || "",
    //   milestone: options.milestone || null
    // };

    //if (!parentTask.subtasks) parentTask.subtasks = [];
    this.pendingChanges.push({ action: "add_body", body: newBody }); //, attributes: { [newBodyName]: newBody } });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    //.writeFileSync(this.pendingFile, yaml.dump(this.pendingChanges, { flowLevel: 1 }));
    return `提案: 立体 ${newBodyName} を追加`;
  }

  applyChanges() {
    for (const change of this.pendingChanges) {
      if (change.action === "add_body") {
        const body = this.findBodyByName(change.body.name, this.data.body);
        if (body) {
          Object.assign(body, change.body);
        } else {
          this.data.body.push(change.body);
        }
      } else if(change.action === "add_zone") {
        const zone = this.findZoneByBodyName(change.zone.body_name, this.data.zone);
        if (zone) {
          Object.assign(zone, change.zone);
        } else {
          this.data.zone.push(change.zone);
        }
      } else if (change.action === "add_source") {
        if (!this.data.source) this.data.source = [];
        // name重複禁止
        if (this.data.source.some(s => s.name === change.source.name)) {
          throw new Error(`source名 ${change.source.name} は既に存在します`);
        }
        this.data.source.push(change.source);
      } else if (change.action === "delete_transform") {
        if (!this.data.transform) this.data.transform = [];
        const idx = this.data.transform.findIndex(t => t.name === change.name);
        if (idx !== -1) this.data.transform.splice(idx, 1);
      } else if (change.action === "delete_body") {
        const bodyIndex = this.data.body.findIndex(b => b.name === change.name);
        if (bodyIndex !== -1) this.data.body.splice(bodyIndex, 1);
      } else if (change.action === "delete_zone") {
        if (change.body_name === 'ATMOSPHERE') continue;
        const zoneIndex = this.data.zone.findIndex(z => z.body_name === change.body_name);
        if (zoneIndex !== -1) this.data.zone.splice(zoneIndex, 1);
      } else if (change.action === "update_body") {
        const body = this.findBodyByName(change.name, this.data.body);
        if (body) {
          Object.keys(change.updates).forEach(key => {
            if (change.updates[key] === null) {
              delete body[key];
            } else {
              body[key] = change.updates[key];
            }
          });
        }
      } else if (change.action === "update_zone") {
        const zone = this.findZoneByBodyName(change.body_name, this.data.zone);
        if (zone) {
          if (change.updates.new_body_name !== undefined) zone.body_name = change.updates.new_body_name;
          if (change.updates.material !== undefined) zone.material = change.updates.material;
          if (change.updates.density !== undefined) {
            if (change.updates.density === null) {
              delete zone.density;
            } else {
              zone.density = change.updates.density;
            }
          }
        }
      } else if (change.action === "update_transform") {
        if (!this.data.transform) this.data.transform = [];
        const t = this.data.transform.find(t => t.name === change.name);
        if (t) {
          if (change.updates.new_name) t.name = change.updates.new_name;
          if (change.updates.operation) t.operation = change.updates.operation;
        }
      } else if (change.action === "add_buildup_factor") {
        if (!this.data.buildup_factor) this.data.buildup_factor = [];
        // 既存の同じmaterialがあれば置き換え
        const idx = this.data.buildup_factor.findIndex(bf => bf.material === change.buildup_factor.material);
        if (idx !== -1) {
          this.data.buildup_factor[idx] = change.buildup_factor;
        } else {
          this.data.buildup_factor.push(change.buildup_factor);
        }
      } else if (change.action === "delete_buildup_factor") {
        if (!this.data.buildup_factor) this.data.buildup_factor = [];
        const idx = this.data.buildup_factor.findIndex(bf => bf.material === change.material);
        if (idx !== -1) {
          this.data.buildup_factor.splice(idx, 1);
        }
      } else if (change.action === "reorder_buildup_factor") {
        if (!this.data.buildup_factor) this.data.buildup_factor = [];
        const idx = this.data.buildup_factor.findIndex(bf => bf.material === change.material);
        if (idx !== -1 && typeof change.newIndex === 'number' && change.newIndex >= 0 && change.newIndex < this.data.buildup_factor.length) {
          const [item] = this.data.buildup_factor.splice(idx, 1);
          this.data.buildup_factor.splice(change.newIndex, 0, item);
        }
      } else if (change.action === "update_buildup_factor") {
        if (!this.data.buildup_factor) this.data.buildup_factor = [];
        const bf = this.data.buildup_factor.find(bf => bf.material === change.material);
        if (bf) {
          if ('use_slant_correction' in change.updates) {
            if (typeof change.updates.use_slant_correction === 'boolean') {
              bf.use_slant_correction = change.updates.use_slant_correction;
            }
          }
          if ('use_finite_medium_correction' in change.updates) {
            if (typeof change.updates.use_finite_medium_correction === 'boolean') {
              bf.use_finite_medium_correction = change.updates.use_finite_medium_correction;
            }
          }
        }
      }
    }
    try {
      fs.chmodSync(this.yamlFile, 0o644);
    } catch (e) {
      // Windows環境など、chmodが効かない場合のエラーを無視
    }
    fs.writeFileSync(this.yamlFile, yaml.dump(this.data, { flowLevel: 1 }));
    this.pendingChanges = [];
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return "変更を適用しました";
  }

  // updateStatus(taskId, newStatus) {
  //   if (!["未開始", "進行中", "完了"].includes(newStatus)) {
  //     throw new Error("ステータスは「未開始」「進行中」「完了」のいずれかである必要があります");
  //   }
    
  //   const task = this.findTaskById(taskId, this.data.tasks);
  //   if (!task) throw new Error(`タスク ${taskId} が見つかりません`);
    
  //   task.status = newStatus;
  //   try {
  //     fs.chmodSync(this.yamlFile, 0o644);
  //   } catch (e) {
  //     // エラーを無視
  //   }
  //   fs.writeFileSync(this.yamlFile, yaml.dump(this.data, { flowLevel: 1 }));
  //   try {
  //     fs.chmodSync(this.yamlFile, 0o444);
  //   } catch (e) {
  //     // エラーを無視
  //   }
  //   return `タスク ${taskId} のステータスを ${newStatus} に更新しました`;
  // }

  // generateMermaidGantt() {
  //   let gantt = 'gantt\n  title プロジェクトタスク\n  dateFormat YYYY-MM-DD\n  axisFormat %Y-%m-%d\n';
  //   let taskOrder = [];
  //   let processed = new Set();

  //   const addTask = (task) => {
  //     if (processed.has(task.id)) return;
  //     const attr = this.data.attributes[task.id];
  //     if (attr && attr.depends_on) {
  //       const depTask = this.findTaskById(attr.depends_on, this.data.tasks);
  //       if (depTask) addTask(depTask);
  //     }
  //     taskOrder.push(task);
  //     processed.add(task.id);
  //   };

  //   this.data.tasks.forEach(task => addTask(task));

  //   taskOrder.forEach(task => {
  //     const attr = this.data.attributes[task.id] || {};
  //     const duration = attr.loop ? "crit, " : "";
  //     const statusMark = task.status === "完了" ? "done, " : task.status === "進行中" ? "active, " : "";
  //     if (attr.milestone) {
  //       gantt += `  ${task.title} [${task.status}] :${statusMark}${duration}${task.id}, ${attr.milestone}, 1d\n`;
  //     } else {
  //       gantt += `  ${task.title} [${task.status}] :${statusMark}${duration}${task.id}, after ${attr.depends_on || 'start'}, 3d\n`;
  //     }
  //     if (task.subtasks) {
  //       task.subtasks.forEach(sub => {
  //         const subAttr = this.data.attributes[sub.id] || {};
  //         const subStatusMark = sub.status === "完了" ? "done, " : sub.status === "進行中" ? "active, " : "";
  //         if (subAttr.milestone) {
  //           gantt += `  ${sub.title} [${sub.status}] :${subStatusMark}${sub.id}, ${subAttr.milestone}, 1d\n`;
  //         } else {
  //           gantt += `  ${sub.title} [${sub.status}] :${subStatusMark}${sub.id}, after ${task.id}, 2d\n`;
  //         }
  //       });
  //     }
  //   });

  //   fs.writeFileSync('tasks/gantt.mmd', gantt);
  //   return "ガントチャートを生成しました: tasks/gantt.mmd";
  // }

  deleteBody(bodyName) {
    // 即時削除せずpendingに追加
    this.pendingChanges.push({ action: "delete_body", name: bodyName });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: 立体 ${bodyName} の削除を保留しました`;
  }

  deleteZone(zoneName) {
    if (zoneName === 'ATMOSPHERE') throw new Error('ATMOSPHEREゾーンは削除できません');
    // 即時削除せずpendingに追加
    this.pendingChanges.push({ action: "delete_zone", body_name: zoneName });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: ゾーン ${zoneName} の削除を保留しました`;
  }

  updateBody(name, updates) {
    // バリデーションは従来通り
    const allowedTypes = ['BOX', 'RPP', 'RCC', 'SPH', 'WED', 'TOR', 'ELL', 'REC', 'TRC', 'CMB'];
    const body = this.findBodyByName(name, this.data.body);
    if (!body) throw new Error(`立体 ${name} が見つかりません`);
    if (!allowedTypes.includes(body.type)) {
      throw new Error(`typeは${allowedTypes.join(', ')}のみ許可されています`);
    }
    const radiusKeys = ['radius', 'major_radius', 'minor_radius', 'bottom_radius', 'top_radius'];
    for (const key of radiusKeys) {
      if (updates[key] !== undefined) {
        const val = updates[key];
        if (typeof val !== 'number' && (typeof val !== 'string' || isNaN(Number(val)))) {
          throw new Error(`${key}は数値で指定してください`);
        }
        const numVal = Number(val);
        if (!(numVal > 0)) {
          throw new Error(`${key}は0を超える数値で指定してください`);
        }
      }
    }
    for (const key of Object.keys(updates)) {
      if (key === 'expression') continue;
      if (radiusKeys.includes(key)) continue;
      const val = updates[key];
      if (typeof val === 'string') {
        const parts = val.trim().split(/\s+/);
        if (parts.length !== 3 || !parts.every(x => !isNaN(Number(x)))) {
          throw new Error(`${key}は3つの数字（空白区切りのベクトル）で指定してください`);
        }
      }
    }
    const typeAllowedKeys = {
      'RPP': ['min', 'max'],
      'SPH': ['center', 'radius'],
      'BOX': ['vertex', 'edge_1', 'edge_2', 'edge_3'],
      'RCC': ['bottom_center', 'height_vector', 'radius'],
      'WED': ['vertex', 'width_vector', 'height_vector', 'depth_vector'],
      'TOR': ['center', 'normal', 'major_radius', 'minor_radius'],
      'ELL': ['center', 'radius_vector_1', 'radius_vector_2', 'radius_vector_3'],
      'REC': ['bottom_center', 'height_vector', 'radius_vector_1', 'radius_vector_2'],
      'TRC': ['bottom_center', 'height_vector', 'bottom_radius', 'top_radius'],
      'CMB': ['expression'],
    };
    if (body.type in typeAllowedKeys) {
      const allowedKeys = typeAllowedKeys[body.type];
      const invalidKeys = Object.keys(updates).filter(key => !allowedKeys.includes(key));
      if (invalidKeys.length > 0) {
        throw new Error(`${body.type}型立体の更新では${allowedKeys.join('、')}以外の属性は許可されていません: ${invalidKeys.join(', ')}`);
      }
    }
    if ('min' in updates) {
      const minVal = updates.min;
      if (typeof minVal !== 'string' || minVal.trim().split(/\s+/).length !== 3 || !minVal.trim().split(/\s+/).every(x => !isNaN(Number(x)))) {
        throw new Error('minは3つの数字（空白区切りのベクトル）で指定してください');
      }
    }
    // pendingに追加
    this.pendingChanges.push({ action: "update_body", name, updates });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: 立体 ${name} の更新を保留しました: ${JSON.stringify(updates)}`;
  }

  updateZone(body_name, updates) {
    // バリデーションは従来通り
    const defaultDensities = {
      'Concrete': 2.1,
      'Iron': 7.8,
      'Lead': 11,
      'Polyethylene': 0.92,
      'Air': 0.001205,
      'Carbon': 2.2,
      'Water': 1,
      'AcrylicResin': 1.19,
      'Aluminium': 2.7,
      'Copper': 8.9,
      'Tungsten': 19
    };
    if (updates.material in defaultDensities && (updates.density === undefined || updates.density === null)) {
      updates.density = defaultDensities[updates.material];
    }
    if (body_name !== 'ATMOSPHERE') {
      const bodyNames = this.data.body.map(b => b.name);
      if (!bodyNames.includes(body_name)) {
        throw new Error('body_nameは既存の立体名のみ許可されています（ATMOSPHEREを除く）');
      }
    }
    if ('density' in updates) {
      const density = updates.density;
      if (density !== null) {
        if (typeof density !== 'number' && (typeof density !== 'string' || isNaN(Number(density)))) {
          throw new Error('densityは数値で指定してください');
        }
        const numVal = Number(density);
        if (!(numVal > 0)) {
          throw new Error('densityは0を超える数値で指定してください');
        }
      }
    }
    const allowedKeys = ['material', 'density', 'new_body_name'];
    const invalidKeys = Object.keys(updates).filter(key => !allowedKeys.includes(key));
    if (invalidKeys.length > 0) {
      throw new Error(`許可されていない属性が含まれています: ${invalidKeys.join(', ')}`);
    }
    // pendingに追加
    this.pendingChanges.push({ action: "update_zone", body_name, updates });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: ゾーン ${body_name} の更新を保留しました: ${JSON.stringify(updates)}`;
  }

  proposeTransform(name, operations) {
    if (!name) throw new Error('回転移動のnameは必須です');
    if (!Array.isArray(operations) || operations.length === 0) throw new Error('operationは配列で1つ以上必要です');
    // operationバリデーション
    for (const op of operations) {
      const keys = Object.keys(op);
      if (keys.length !== 1) throw new Error('各operationは1つのキーのみ指定してください');
      const key = keys[0];
      const val = op[key];
      switch (key) {
        case 'rotate_around_x':
        case 'rotate_around_y':
        case 'rotate_around_z':
          if (!(typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val))))) {
            throw new Error(`${key}の値は数値で指定してください`);
          }
          break;
        case 'rotate_by_axis_angle':
          if (typeof val !== 'object' || !val.axis || !val.angle) {
            throw new Error('rotate_by_axis_angleはaxis（数字3つ）とangle（数字1つ）が必須です');
          }
          if (typeof val.axis !== 'string' || val.axis.trim().split(/\s+/).length !== 3 || !val.axis.trim().split(/\s+/).every(x => !isNaN(Number(x)))) {
            throw new Error('rotate_by_axis_angle.axisは3つの数字（空白区切り）で指定してください');
          }
          if (!(typeof val.angle === 'number' || (typeof val.angle === 'string' && !isNaN(Number(val.angle))))) {
            throw new Error('rotate_by_axis_angle.angleは数値で指定してください');
          }
          break;
        case 'rotate_by_matrix':
          if (typeof val !== 'object' || !val.row_1 || !val.row_2 || !val.row_3) {
            throw new Error('rotate_by_matrixはrow_1, row_2, row_3（各3つの数字）が必須です');
          }
          for (const row of ['row_1', 'row_2', 'row_3']) {
            if (typeof val[row] !== 'string' || val[row].trim().split(/\s+/).length !== 3 || !val[row].trim().split(/\s+/).every(x => !isNaN(Number(x)))) {
              throw new Error(`rotate_by_matrix.${row}は3つの数字（空白区切り）で指定してください`);
            }
          }
          break;
        case 'translate':
          if (typeof val !== 'string' || val.trim().split(/\s+/).length !== 3 || !val.trim().split(/\s+/).every(x => !isNaN(Number(x)))) {
            throw new Error('translateは3つの数字（空白区切り）で指定してください');
          }
          break;
        default:
          throw new Error(`許可されていないoperationキー: ${key}`);
      }
    }
    if (!this.data.transform) this.data.transform = [];
    // name重複禁止
    if (this.data.transform.some(t => t.name === name)) {
      throw new Error(`回転移動 ${name} は既に存在します`);
    }
    const newTransform = { name, operation: operations };
    this.data.transform.push(newTransform);
    try {
      fs.chmodSync(this.yamlFile, 0o644);
    } catch (e) {}
    fs.writeFileSync(this.yamlFile, yaml.dump(this.data, { flowLevel: 1 }));
    return `回転移動 ${name} を追加しました`;
  }

  findTransformByName(name) {
    if (!this.data.transform) return null;
    return this.data.transform.find(t => t.name === name) || null;
  }

  deleteTransform(name) {
    // 即時削除せずpendingに追加
    this.pendingChanges.push({ action: "delete_transform", name });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: transform ${name} の削除を保留しました`;
  }

  updateTransform(name, updates) {
    // name: 既存transform名, updates: { new_name?, operation? }
    if (!name) throw new Error('更新対象のtransform名(name)は必須です');
    if (!this.data.transform) this.data.transform = [];
    const t = this.data.transform.find(t => t.name === name);
    if (!t) throw new Error(`transform ${name} が見つかりません`);
    // new_name変更時の重複禁止
    if (updates.new_name && updates.new_name !== name) {
      if (this.data.transform.some(tr => tr.name === updates.new_name)) {
        throw new Error(`transform名 ${updates.new_name} は既に存在します`);
      }
    }
    // operationバリデーション
    if (updates.operation) {
      const operations = updates.operation;
      if (!Array.isArray(operations) || operations.length === 0) throw new Error('operationは配列で1つ以上必要です');
      for (const op of operations) {
        const keys = Object.keys(op);
        if (keys.length !== 1) throw new Error('各operationは1つのキーのみ指定してください');
        const key = keys[0];
        const val = op[key];
        switch (key) {
          case 'rotate_around_x':
          case 'rotate_around_y':
          case 'rotate_around_z':
            if (!(typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val))))) {
              throw new Error(`${key}の値は数値で指定してください`);
            }
            break;
          case 'rotate_by_axis_angle':
            if (typeof val !== 'object' || !val.axis || !val.angle) {
              throw new Error('rotate_by_axis_angleはaxis（数字3つ）とangle（数字1つ）が必須です');
            }
            if (typeof val.axis !== 'string' || val.axis.trim().split(/\s+/).length !== 3 || !val.axis.trim().split(/\s+/).every(x => !isNaN(Number(x)))) {
              throw new Error('rotate_by_axis_angle.axisは3つの数字（空白区切り）で指定してください');
            }
            if (!(typeof val.angle === 'number' || (typeof val.angle === 'string' && !isNaN(Number(val.angle))))) {
              throw new Error('rotate_by_axis_angle.angleは数値で指定してください');
            }
            break;
          case 'rotate_by_matrix':
            if (typeof val !== 'object' || !val.row_1 || !val.row_2 || !val.row_3) {
              throw new Error('rotate_by_matrixはrow_1, row_2, row_3（各3つの数字）が必須です');
            }
            for (const row of ['row_1', 'row_2', 'row_3']) {
              if (typeof val[row] !== 'string' || val[row].trim().split(/\s+/).length !== 3 || !val[row].trim().split(/\s+/).every(x => !isNaN(Number(x)))) {
                throw new Error(`rotate_by_matrix.${row}は3つの数字（空白区切り）で指定してください`);
              }
            }
            break;
          case 'translate':
            if (typeof val !== 'string' || val.trim().split(/\s+/).length !== 3 || !val.trim().split(/\s+/).every(x => !isNaN(Number(x)))) {
              throw new Error('translateは3つの数字（空白区切り）で指定してください');
            }
            break;
          default:
            throw new Error(`許可されていないoperationキー: ${key}`);
        }
      }
    }
    this.pendingChanges.push({ action: "update_transform", name, updates });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: transform ${name} の更新を保留しました: ${JSON.stringify(updates)}`;
  }

  // buildup_factorノード追加
  proposeBuildupFactor(material, use_slant_correction = false, use_finite_medium_correction = false) {
    // proposeZoneと同じmaterialのみ許可
    const defaultDensities = {
      'Concrete': 2.1,
      'Iron': 7.8,
      'Lead': 11,
      'Polyethylene': 0.92,
      'Air': 0.001205,
      'Carbon': 2.2,
      'Water': 1,
      'AcrylicResin': 1.19,
      'Aluminium': 2.7,
      'Copper': 8.9,
      'Tungsten': 19,
      'PyrexGlass': 2.23,
      'Soil': 1.5,
      'Concrete_Si': 2.156,
      'Concrete_Ca': 2.156,
      'Heavy_concrete_T': 3.86,
      'Heavy_concrete_FP': 4.8,
      'Heavy_concrete_IL': 4.4,
      'SUS_A': 7.8,
      'SUS_B': 7.7,
      'Cast_Iron': 7,
      'Epoxy_Resin': 1.25,
      'Zirc-4': 6.5,
      'Source_Dry': 1.97,
      'Cast_Iron_PIE': 7.0953
    };
    if (!(material in defaultDensities)) {
      throw new Error(`materialはゾーンで許可された材料のみ指定できます: ${Object.keys(defaultDensities).join(', ')}`);
    }
    if (typeof use_slant_correction !== 'boolean' || typeof use_finite_medium_correction !== 'boolean') {
      throw new Error('use_slant_correction, use_finite_medium_correctionはbooleanで指定してください');
    }
    if (!this.data.buildup_factor) this.data.buildup_factor = [];
    // 既存重複チェック
    if (this.data.buildup_factor.some(bf => bf.material === material)) {
      throw new Error(`buildup_factor: material=${material} は既に存在します`);
    }
    const newBuildup = { material, use_slant_correction, use_finite_medium_correction };
    this.pendingChanges.push({ action: "add_buildup_factor", buildup_factor: newBuildup });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: buildup_factor ${material} を追加`;
  }

  findBuildupFactorByMaterial(material) {
    if (!this.data.buildup_factor) return null;
    return this.data.buildup_factor.find(bf => bf.material === material) || null;
  }

  changeOrderBuildupFactor(material, newIndex) {
    if (!this.data.buildup_factor) this.data.buildup_factor = [];
    const idx = this.data.buildup_factor.findIndex(bf => bf.material === material);
    if (idx === -1) throw new Error(`material=${material} のビルドアップ係数が見つかりません`);
    if (typeof newIndex !== 'number' || newIndex < 0 || newIndex >= this.data.buildup_factor.length) {
      throw new Error(`newIndexは0以上${this.data.buildup_factor.length - 1}以下の整数で指定してください`);
    }
    // 即時反映せずpendingに追加
    this.pendingChanges.push({ action: "reorder_buildup_factor", material, newIndex });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: buildup_factor ${material} を${newIndex}番目に移動を保留しました`;
  }

  deleteBuildupFactor(material) {
    if (!this.data.buildup_factor) throw new Error('buildup_factorノードが存在しません');
    const idx = this.data.buildup_factor.findIndex(bf => bf.material === material);
    if (idx === -1) throw new Error(`material=${material} のビルドアップ係数が見つかりません`);
    // 削除可能な場合のみpendingに追加
    this.pendingChanges.push({ action: "delete_buildup_factor", material });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: buildup_factor ${material} の削除を保留しました`;
  }

  updateBuildupFactor(material, updates) {
    if (!this.data.buildup_factor) throw new Error('buildup_factorノードが存在しません');
    const bf = this.data.buildup_factor.find(bf => bf.material === material);
    if (!bf) throw new Error(`material=${material} のビルドアップ係数が見つかりません`);
    // 即時反映せずpendingに追加
    this.pendingChanges.push({ action: "update_buildup_factor", material, updates });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: buildup_factor ${material} の更新を保留しました`;
  }

  proposeSource(params) {
    // 必須パラメータチェック
    const { name, type, geometry, division, inventory, cutoff_rate, path_trace } = params;
    const allowedTypes = ['POINT', 'BOX', 'RPP', 'SPH', 'RCC'];
    if (!name || !type) throw new Error('nameとtypeは必須です');
    if (!allowedTypes.includes(type)) throw new Error(`typeは${allowedTypes.join(', ')}のみ許可されています`);
    if (!inventory || !Array.isArray(inventory) || inventory.length === 0) throw new Error('inventoryは1つ以上必要です');
    if (typeof cutoff_rate !== 'number' && (typeof cutoff_rate !== 'string' || isNaN(Number(cutoff_rate)))) throw new Error('cutoff_rateは数値で指定してください');
    // name重複禁止
    if (this.data.source && this.data.source.some(s => s.name === name)) throw new Error(`source名 ${name} は既に存在します`);
    // geometryバリデーション
    let geom = undefined;
    if (type === 'POINT') {
      if (!params.position && !geometry?.position) throw new Error('POINT型はpositionが必須です');
      geom = undefined; // geometry不要
    } else {
      if (!geometry) throw new Error(`${type}型はgeometryが必須です`);
      // typeごとに必要なキー
      const geomKeys = {
        'BOX': ['vertex', 'edge_1', 'edge_2', 'edge_3'],
        'RPP': ['min', 'max'],
        'SPH': ['center', 'radius'],
        'RCC': ['bottom_center', 'height_vector', 'radius']
      };
      const keys = geomKeys[type];
      if (!keys) throw new Error(`${type}型のgeometryバリデーション未定義`);
      for (const k of keys) {
        if (!geometry[k]) throw new Error(`${type}型geometryの${k}は必須です`);
      }
      geom = { ...geometry };
      // transformバリデーション
      if (geometry.transform) {
        const transformList = (this.data.transform || []).map(t => t.name);
        if (!transformList.includes(geometry.transform)) {
          throw new Error(`geometry.transformはtransformノードで定義された名前のみ許可: ${transformList.join(', ')}`);
        }
      }
    }
    // divisionバリデーション
    let div = undefined;
    if (type !== 'POINT') {
      if (!division) throw new Error(`${type}型はdivisionが必須です`);
      // divisionの必須キー
      const divKeys = {
        'BOX': ['edge_1', 'edge_2', 'edge_3'],
        'RPP': ['edge_1', 'edge_2', 'edge_3'],
        'SPH': ['r', 'theta', 'phi'],
        'RCC': ['r', 'phi', 'z']
      };
      const keys = divKeys[type];
      if (!keys) throw new Error(`${type}型のdivisionバリデーション未定義`);
      for (const k of keys) {
        if (!division[k]) throw new Error(`${type}型divisionの${k}は必須です`);
        if (typeof division[k].number !== 'number' && (typeof division[k].number !== 'string' || isNaN(Number(division[k].number)))) throw new Error(`${type}型divisionの${k}.numberは数値で指定してください`);
      }
      div = { ...division };
    }
    // inventoryバリデーション
    for (const inv of inventory) {
      if (!inv.nuclide || inv.radioactivity === undefined) throw new Error('inventory要素はnuclide, radioactivity必須');
      if (typeof inv.radioactivity !== 'number' && (typeof inv.radioactivity !== 'string' || isNaN(Number(inv.radioactivity)))) throw new Error('inventory.radioactivityは数値で指定してください');
    }
    // sourceノード作成
    let newSource = { type, name, cutoff_rate: Number(cutoff_rate), inventory: inventory.map(inv => ({ nuclide: inv.nuclide, radioactivity: Number(inv.radioactivity) })) };
    if (type === 'POINT') {
      newSource.position = params.position || (geometry ? geometry.position : undefined);
      if (params.transform) newSource.transform = params.transform;
      if (path_trace) newSource.path_trace = path_trace;
    } else {
      newSource.geometry = geom;
      newSource.division = div;
      if (path_trace) newSource.path_trace = path_trace;
    }
    this.pendingChanges.push({ action: 'add_source', source: newSource });
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    return `提案: source ${name} を追加`;
  }
}
// タスクマネージャーのインスタンスを作成
const manager = new TaskManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');

// JSON-RPCレスポンスヘルパー関数
function jsonRpcSuccess(id, result) {
  return {
    jsonrpc: '2.0',
    id: id,
    result: result
  };
}

function jsonRpcError(id, code, message, data = null) {
  const error = {
    code: code,
    message: message
  };
  
  if (data) {
    error.data = data;
  }
  
  return {
    jsonrpc: '2.0',
    id: id,
    error: error
  };
}

// Expressアプリを作成
const app = express();
const PORT = 3000;

// JSONボディパーサーミドルウェアを使用
app.use(express.json());

// CORS設定
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// MCP JSON-RPCエンドポイント
app.post('/mcp', (req, res) => {
  try {
    const jsonBody = req.body;
    console.log('受信したJSON-RPCリクエスト:', JSON.stringify(jsonBody, null, 2));
    
    // JSON-RPC形式チェック
    if (!jsonBody.jsonrpc || jsonBody.jsonrpc !== '2.0' || !jsonBody.method) {
      return res.json(jsonRpcError(jsonBody.id, -32600, 'Invalid Request'));
    }
    
    // メソッド処理
    switch (jsonBody.method) {
      case 'pokerinput.applyChanges':
        try {
          const result = manager.applyChanges();
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変更適用エラー: ${error.message}`));
        }
        
      case 'pokerinput.proposeBody':
        try {
          const { name, type, ...options } = jsonBody.params;
          if (!name || !type) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: name と type は必須です'));
          }
          const result = manager.proposeBody(name, type, options);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体提案エラー: ${error.message}`));
        }
      case 'pokerinput.proposeZone':
        try {
          const { body_name, material, density } = jsonBody.params;
          if (!body_name || !material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_name と material は必須です'));
          }
          const result = manager.proposeZone(body_name, material, density);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン提案エラー: ${error.message}`));
        }
      case 'pokerinput.updateZone':
        try {
          const { body_name, material, density, new_body_name } = jsonBody.params;
          if (!body_name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_name は必須です'));
          }
          const updates = {};
          if (material !== undefined) updates.material = material;
          if (density !== undefined) updates.density = density;
          if (new_body_name !== undefined) updates.new_body_name = new_body_name;
          const result = manager.updateZone(body_name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン更新エラー: ${error.message}`));
        }
      // case 'task.updateStatus':
      //   try {
      //     const { taskId, status } = jsonBody.params;
      //     if (!taskId || !status) {
      //       return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: taskId と status は必須です'));
      //     }
      //     const result = manager.updateStatus(taskId, status);
      //     return res.json(jsonRpcSuccess(jsonBody.id, { result }));
      //   } catch (error) {
      //     return res.json(jsonRpcError(jsonBody.id, -32000, `ステータス更新エラー: ${error.message}`));
      //   }
        
      // case 'task.generateGantt':
      //   try {
      //     const result = manager.generateMermaidGantt();
      //     return res.json(jsonRpcSuccess(jsonBody.id, { result }));
      //   } catch (error) {
      //     return res.json(jsonRpcError(jsonBody.id, -32000, `ガントチャート生成エラー: ${error.message}`));
      //   }
        
      case 'pokerinput.deleteBody':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: name は必須です'));
          }
          const result = manager.deleteBody(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体削除エラー: ${error.message}`));
        }
      case 'pokerinput.deleteZone':
        try {
          const { body_name } = jsonBody.params;
          if (!body_name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_name は必須です'));
          }
          const result = manager.deleteZone(body_name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン削除エラー: ${error.message}`));
        }
      case 'pokerinput.updateBody':
        try {
          const { name, ...updates } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: name は必須です'));
          }
          const result = manager.updateBody(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体更新エラー: ${error.message}`));
        }
      case 'pokerinput.proposeTransform':
        try {
          const { name, operation } = jsonBody.params;
          if (!name || !operation) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameとoperationは必須です'));
          }
          const result = manager.proposeTransform(name, operation);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `transform追加エラー: ${error.message}`));
        }
      case 'pokerinput.deleteTransform':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.deleteTransform(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `transform削除エラー: ${error.message}`));
        }
      case 'pokerinput.updateTransform':
        try {
          const { name, ...updates } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.updateTransform(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `transform更新エラー: ${error.message}`));
        }
      case 'pokerinput.proposeBuildupFactor':
        try {
          const { material, use_slant_correction, use_finite_medium_correction } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.proposeBuildupFactor(material, use_slant_correction, use_finite_medium_correction);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `buildup_factor追加エラー: ${error.message}`));
        }
      case 'pokerinput.changeOrderBuildupFactor':
        try {
          const { material, newIndex } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.changeOrderBuildupFactor(material, newIndex);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `buildup_factor移動エラー: ${error.message}`));
        }
      case 'pokerinput.deleteBuildupFactor':
        try {
          const { material } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.deleteBuildupFactor(material);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `buildup_factor削除エラー: ${error.message}`));
        }
      case 'pokerinput.updateBuildupFactor':
        try {
          const { material, use_slant_correction, use_finite_medium_correction } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.updateBuildupFactor(material, { use_slant_correction, use_finite_medium_correction });
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `buildup_factor更新エラー: ${error.message}`));
        }
      case 'pokerinput.proposeSource':
        try {
          const result = manager.proposeSource(jsonBody.params);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `source提案エラー: ${error.message}`));
        }
      default:
        return res.json(jsonRpcError(jsonBody.id, -32601, `Method not found: ${jsonBody.method}`));
    }
  } catch (error) {
    console.error('JSON-RPCリクエスト処理エラー:', error);
    return res.json(jsonRpcError(null, -32700, 'Parse error', error.message));
  }
});

// サーバー情報エンドポイント
app.get('/mcp', (req, res) => {
  res.json({
    name: "pokerinput-mcp",
    version: "1.0.1",
    description: "PokerInput MCP Server",
    endpoints: {
      jsonrpc: "/mcp"
    },
    methods: [
      "pokerinput.proposeBody",
      "pokerinput.applyChanges",
      "pokerinput.deleteBody",
      "pokerinput.proposeZone",
      "pokerinput.deleteZone",
      "pokerinput.updateZone",
      "pokerinput.updateBody",
      "pokerinput.proposeTransform",
      "pokerinput.deleteTransform",
      "pokerinput.updateTransform",
      "pokerinput.proposeBuildupFactor",
      "pokerinput.changeOrderBuildupFactor",
      "pokerinput.deleteBuildupFactor",
      "pokerinput.updateBuildupFactor",
      "pokerinput.proposeSource"
    ]
  });
});

// サーバーを起動
app.listen(PORT, () => {
  console.log(`MCPサーバPokerInputが起動: http://localhost:${PORT}`);
  console.log('以下のコマンドで入力ファイル管理ができます:');
  console.log('- 変更適用: pokerinput.applyChanges()');
  console.log('- 立体提案: pokerinput.proposeBody({ name: b1, type: BOX, ...options })');
  console.log('- 立体削除: pokerinput.deleteBody({ name: b1 })');
  console.log('- 立体更新: pokerinput.updateBody({ name: b1, radius: 10 })');
  console.log('- ゾーン提案: pokerinput.proposeZone({ body_name: b1, material: AIR, density: 1.0 })');
  console.log('- ゾーン削除: pokerinput.deleteZone({ body_name: b1 })');
  console.log('- ゾーン更新: pokerinput.updateZone({ body_name: b1, material: AIR, density: 1.0 })');
  console.log('- 回転移動提案: pokerinput.proposeTransform({ name: t1, operation: [rotate, translate] })');
  console.log('- 回転移動削除: pokerinput.deleteTransform({ name: t1})');
  console.log('- 回転移動更新: pokerinput.updateTransform({ name: t1, operation: [rotate, translate] })');
  console.log('- ビルドアップ係数提案: pokerinput.proposeBuildupFactor({ material: AIR, use_slant_correction: true, use_finite_medium_correction: true })');
  console.log('- ビルドアップ係数順序変更: pokerinput.changeOrderBuildupFactor({ material: AIR, newIndex: 0 })');
  console.log('- ビルドアップ係数削除: pokerinput.deleteBuildupFactor({ material: AIR })');
  console.log('- ビルドアップ係数更新: pokerinput.updateBuildupFactor({ material: AIR, use_slant_correction: true, use_finite_medium_correction: true })');
  console.log('- source提案: pokerinput.proposeSource({ name: s1, type: POINT, position: "0 0 0", inventory: [...], cutoff_rate: 0.0001 })');
});

// 例外ハンドリングを追加してプロセスが停止しないようにする
process.on('uncaughtException', (err) => {
  console.error('未処理の例外が発生しました:', err);
});

console.log('サーバプロセスは実行中です。Ctrl+Cで停止できます。'); 