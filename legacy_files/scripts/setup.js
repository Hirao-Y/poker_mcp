import fs from 'fs';
import yaml from 'js-yaml';

const initialData = {
  "unit": {
    "length": "cm",
    "angle": "radian",
    "density": "g/cm3",
    "radioactivity": "Bq"
  },
  "transform": [],
  "body": [],
  "zone": [
    {
      "body_name": "ATMOSPHERE",
      "material": "VOID"
    }
  ],
  "buildup_factor": [],
  "source": [],
  "detector": []
};

function setupTaskEnvironment() {
  if (!fs.existsSync('tasks')) {
    console.log('tasks ディレクトリを作成します');
    fs.mkdirSync('tasks');
  }
  console.log('pokerinputs.yaml を書き込みます');
  fs.writeFileSync('tasks/pokerinputs.yaml', yaml.dump(initialData, { flowLevel: 1 }));
  // try {
  //   console.log('pokerinputs.yaml を読み取り専用にします');
  //   fs.chmodSync('tasks/pokerinputs.yaml', 0o444); // 読み取り専用（Unix系OSのみ）
  // } catch (error) {
  //   console.log('注意: ファイルを読み取り専用に設定できません。手動でタスクファイルを編集しないでください。');
  // }
  console.log('pending_changes.json を書き込みます');
  fs.writeFileSync('tasks/pending_changes.json', JSON.stringify([], null, 2));
  console.log('POKERINPUT管理環境を作成しました: tasks/');
}

// ESMではrequire.mainが存在しないので直接実行
setupTaskEnvironment();

// エクスポートをESM形式に変更
export { setupTaskEnvironment }; 