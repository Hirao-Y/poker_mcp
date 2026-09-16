// cadTools.js
//
// CAD 連携レイトレース（.paths の生成）のツール定義。
//
// FreeCAD のソリッドモデルから線源点→検出器の経路を抽出し、POKER に渡す
// .paths ファイルを作る。従来は freecadcmd を手で叩き、spec.json を手書きする
// 必要があったが、このツールがその手順をまとめる。
//
// FreeCAD の場所は環境変数 FREECAD_PATH で指定する。未設定なら既定の
// インストール先を探す。

export const cadTools = [
  {
    name: 'poker_generatePaths',
    description:
      'FreeCAD のモデルから経路ファイル(.paths)を生成します。線源分割点→検出器評価点の直線を追跡し、通過した材質と厚さを記録します。' +
      'CSG プリミティブで表現しにくい形状（フィレット、自由曲面、多数の貫通孔など）をそのまま遮蔽計算に使えます。' +
      '内部で poker_cui -p を実行して分割点と評価点を取得し、FreeCAD をヘッドレスで起動してトレースします。' +
      '生成後は executeCalculation の path_input に指定するか、poker_cui --path-input で計算します。',
    inputSchema: {
      type: 'object',
      properties: {
        fcstd: {
          type: 'string',
          description: 'FreeCAD モデルのパス（.FCStd）。ソリッドに PokerMaterial プロパティで材質名を設定しておくこと。'
        },
        output: {
          type: 'string',
          description: '出力する .paths のパス。省略時は作業ディレクトリの poker.paths。'
        },
        deviation: {
          type: 'number',
          minimum: 0.001,
          description: 'テッセレーション偏差 [mm]。既定 0.5。曲面を三角形で近似する際の最大のずれ。球面や複曲面が支配的な体系では小さくする（0.1 で誤差が約 1/10 になる）。'
        },
        unit_scale: {
          type: 'number',
          description: 'CAD 単位 → POKER 単位の倍率。既定 0.1（FreeCAD の mm → POKER の cm）。'
        },
        mu_energy: {
          type: 'number',
          description: '層の縮約に使う参照エネルギー [MeV]。既定 1.25。ビルドアップ層の選定（参考情報）にのみ影響し、線量計算には使われない。'
        },
        source_name: {
          type: 'string',
          description: '線源名。省略時は全線源を対象にする。'
        },
        buildup_exclude: {
          type: 'array',
          items: { type: 'string' },
          description: 'ビルドアップ層の候補から除外する材質。既定 ["VOID","Air"]。大気中の長距離伝播で Air を遮蔽として数えたい場合などに変更する。減衰計算には影響せず、層の縮約（参考情報）にのみ効く。'
        },
        chunk: {
          type: 'integer',
          minimum: 1024,
          description: 'レイトレースのバッチサイズ。既定 32768。メモリが厳しい環境では下げる。結果には影響しない。'
        }
      },
      required: ['fcstd'],
      additionalProperties: false,
      title: 'CAD から経路ファイルを生成',
      description: '入力 YAML の線源・検出器の定義と、FreeCAD のモデルを突き合わせて .paths を作ります。'
    }
  },
  {
    name: 'poker_generateInput',
    description:
      'FreeCAD のモデルから POKER の YAML 入力を生成します。CAD が正本という前提で、' +
      '線源・検出器・材質・分割数を CAD のカスタムプロパティから読み取ります。' +
      '子孫核種（Cs137 → Ba137m など）は自動で補完します。忘れると線量が桁違いに' +
      '小さくなるため（実測で 1/3）、poker_mcp 側で必ず通します。' +
      '続けて poker_generatePaths を呼べば、CAD の形状で計算できます。',
    inputSchema: {
      type: 'object',
      properties: {
        fcstd: {
          type: 'string',
          description: 'FreeCAD モデルのパス（.FCStd）。'
        },
        output: {
          type: 'string',
          description: '出力する YAML のパス。省略時は作業ディレクトリの poker.yaml。'
        }
      },
      required: ['fcstd'],
      additionalProperties: false,
      title: 'CAD から POKER 入力を生成',
      description: 'CAD のカスタムプロパティ: PokerRole(shield/source/detector)、PokerMaterial、PokerDensity、PokerNuclides、PokerDivision、PokerCutoff、PokerGrid、PokerShowPathTrace。'
    }
  }
];
