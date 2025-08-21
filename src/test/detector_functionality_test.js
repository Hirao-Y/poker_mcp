// test/detector_functionality_test.js
// 検出器機能の動作確認テスト

/**
 * このテストは実装されたDetector機能の動作確認用です
 * 
 * テストシナリオ:
 * 1. 点検出器の提案・追加
 * 2. 1次元グリッド検出器の提案・追加  
 * 3. 2次元グリッド検出器の提案・追加
 * 4. 3次元グリッド検出器の提案・追加
 * 5. 検出器の更新
 * 6. 検出器の削除
 * 7. エラーケースの確認
 */

// テスト用のMCPリクエスト例

// 1. 点検出器の提案
const pointDetectorRequest = {
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_proposeDetector",
    "arguments": {
      "name": "point_detector_1",
      "origin": "0 0 100",
      "show_path_trace": true
    }
  }
};

// 2. 1次元グリッド検出器の提案
const grid1DDetectorRequest = {
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_proposeDetector",
    "arguments": {
      "name": "grid_1d_detector",
      "origin": "0 0 50",
      "grid": [
        {
          "edge": "10 0 0",
          "number": 10
        }
      ],
      "show_path_trace": false
    }
  }
};

// 3. 2次元グリッド検出器の提案
const grid2DDetectorRequest = {
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_proposeDetector",
    "arguments": {
      "name": "grid_2d_detector",
      "origin": "-50 -50 0",
      "grid": [
        {
          "edge": "10 0 0",
          "number": 10
        },
        {
          "edge": "0 10 0",
          "number": 10
        }
      ],
      "show_path_trace": true
    }
  }
};

// 4. 3次元グリッド検出器の提案
const grid3DDetectorRequest = {
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_proposeDetector",
    "arguments": {
      "name": "grid_3d_detector",
      "origin": "-25 -25 -25",
      "grid": [
        {
          "edge": "5 0 0",
          "number": 10
        },
        {
          "edge": "0 5 0",
          "number": 10
        },
        {
          "edge": "0 0 5",
          "number": 10
        }
      ],
      "show_path_trace": false
    }
  }
};

// 5. 検出器の更新
const updateDetectorRequest = {
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_updateDetector",
    "arguments": {
      "name": "point_detector_1",
      "origin": "10 10 110",
      "show_path_trace": false
    }
  }
};

// 6. 検出器の削除
const deleteDetectorRequest = {
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_deleteDetector",
    "arguments": {
      "name": "grid_1d_detector"
    }
  }
};

// 7. 変更の適用
const applyChangesRequest = {
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_applyChanges",
    "arguments": {}
  }
};

// エラーケース

// 無効なgrid次元（4次元）
const invalidGridDimensionRequest = {
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_proposeDetector",
    "arguments": {
      "name": "invalid_4d_detector",
      "origin": "0 0 0",
      "grid": [
        {"edge": "1 0 0", "number": 5},
        {"edge": "0 1 0", "number": 5},
        {"edge": "0 0 1", "number": 5},
        {"edge": "1 1 1", "number": 5}  // 4次元は無効
      ]
    }
  }
};

// 重複する検出器名
const duplicateDetectorNameRequest = {
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_proposeDetector",
    "arguments": {
      "name": "point_detector_1",  // 既存の名前
      "origin": "5 5 5"
    }
  }
};

// 無効な座標形式
const invalidCoordinatesRequest = {
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_proposeDetector",
    "arguments": {
      "name": "invalid_coords_detector",
      "origin": "x y z"  // 無効な座標
    }
  }
};

// 存在しない検出器の更新
const updateNonexistentDetectorRequest = {
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_updateDetector",
    "arguments": {
      "name": "nonexistent_detector",
      "origin": "0 0 0"
    }
  }
};

// 存在しない検出器の削除
const deleteNonexistentDetectorRequest = {
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "pokerinput_deleteDetector",
    "arguments": {
      "name": "nonexistent_detector"
    }
  }
};

/**
 * 期待される結果：
 * 
 * 成功ケース:
 * - point_detector_1: POINT検出器として作成・更新
 * - grid_1d_detector: GRID_1D検出器として作成・削除
 * - grid_2d_detector: GRID_2D検出器として作成
 * - grid_3d_detector: GRID_3D検出器として作成
 * 
 * エラーケース:
 * - 4次元grid: ValidationError
 * - 重複名: ValidationError  
 * - 無効座標: ValidationError
 * - 存在しない検出器の更新/削除: ValidationError
 * 
 * YAMLファイル出力例：
 * detector:
 *   - name: point_detector_1
 *     origin: 10 10 110
 *     grid: []
 *     show_path_trace: false
 *   - name: grid_2d_detector
 *     origin: -50 -50 0
 *     grid:
 *       - edge: 10 0 0
 *         number: 10
 *       - edge: 0 10 0
 *         number: 10
 *     show_path_trace: true
 *   - name: grid_3d_detector
 *     origin: -25 -25 -25
 *     grid:
 *       - edge: 5 0 0
 *         number: 10
 *       - edge: 0 5 0
 *         number: 10
 *       - edge: 0 0 5
 *         number: 10
 *     show_path_trace: false
 */

export {
  pointDetectorRequest,
  grid1DDetectorRequest,
  grid2DDetectorRequest,
  grid3DDetectorRequest,
  updateDetectorRequest,
  deleteDetectorRequest,
  applyChangesRequest,
  invalidGridDimensionRequest,
  duplicateDetectorNameRequest,
  invalidCoordinatesRequest,
  updateNonexistentDetectorRequest,
  deleteNonexistentDetectorRequest
};
