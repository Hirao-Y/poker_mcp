// mcp/tools/transformTools.js
export const transformTools = [
  {
    name: 'poker_proposeTransform',
    description: '回転・移動変換を提案します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '変換の一意な名前'
        },
        operations: {
          type: 'array',
          description: '変換操作の配列',
          items: {
            "type": "object",
            "description": "変換操作。キーを 1 つだけ持つ。操作は上から順に、固定した座標軸の周りに作用する（前の操作の結果を次の操作が動かす）。角度は unit.angle、長さは unit.length の単位。回転は右ねじの向きが正で、center を省くと原点の周り。旧 rotate_by_rpy（3 値）・rotate_by_eulerzxz・rotate_by_eulerxyz は POKER 2.3.4 で廃止",
            "properties": {
              "rotate_around_x": {
                "anyOf": [
                  {
                    "type": "number",
                    "description": "角度（unit.angle の単位）"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "angle": {
                        "type": "number"
                      },
                      "center": {
                        "type": "string",
                        "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                      }
                    },
                    "required": [
                      "angle"
                    ],
                    "additionalProperties": false
                  }
                ],
                "description": "x 軸の周りに回す：角度、または {angle, center}"
              },
              "rotate_around_y": {
                "anyOf": [
                  {
                    "type": "number",
                    "description": "角度（unit.angle の単位）"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "angle": {
                        "type": "number"
                      },
                      "center": {
                        "type": "string",
                        "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                      }
                    },
                    "required": [
                      "angle"
                    ],
                    "additionalProperties": false
                  }
                ],
                "description": "y 軸の周りに回す：角度、または {angle, center}"
              },
              "rotate_around_z": {
                "anyOf": [
                  {
                    "type": "number",
                    "description": "角度（unit.angle の単位）"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "angle": {
                        "type": "number"
                      },
                      "center": {
                        "type": "string",
                        "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                      }
                    },
                    "required": [
                      "angle"
                    ],
                    "additionalProperties": false
                  }
                ],
                "description": "z 軸の周りに回す：角度、または {angle, center}"
              },
              "rotate_by_axis_angle": {
                "type": "object",
                "description": "任意の向きの軸の周りに回す",
                "properties": {
                  "axis": {
                    "type": "string",
                    "description": "\"x y z\"（空白区切りの 3 つの数）"
                  },
                  "angle": {
                    "type": "number"
                  },
                  "center": {
                    "type": "string",
                    "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                  }
                },
                "required": [
                  "axis",
                  "angle"
                ],
                "additionalProperties": false
              },
              "rotate_by_euler": {
                "type": "object",
                "description": "オイラー角。sequence = ABC、angles = \"a b c\" として、intrinsic（回ってできた軸の周りに順に）は R = R_A(a)·R_B(b)·R_C(c)、extrinsic（最初の座標軸の周りに順に）は R = R_C(c)·R_B(b)·R_A(a)",
                "properties": {
                  "sequence": {
                    "enum": [
                      "xyz",
                      "xzy",
                      "yxz",
                      "yzx",
                      "zxy",
                      "zyx",
                      "xyx",
                      "xzx",
                      "yxy",
                      "yzy",
                      "zxz",
                      "zyz"
                    ]
                  },
                  "angles": {
                    "type": "string",
                    "description": "1・2・3 番目の軸の周りの角度 \"a b c\""
                  },
                  "frame": {
                    "enum": [
                      "intrinsic",
                      "extrinsic"
                    ]
                  },
                  "center": {
                    "type": "string",
                    "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                  }
                },
                "required": [
                  "sequence",
                  "angles",
                  "frame"
                ],
                "additionalProperties": false
              },
              "rotate_by_rpy": {
                "type": "object",
                "description": "ロール・ピッチ・ヨー：固定した座標軸の周りに x（roll）→ y（pitch）→ z（yaw）の順に回す。R = Rz(yaw)·Ry(pitch)·Rx(roll)",
                "properties": {
                  "roll": {
                    "type": "number"
                  },
                  "pitch": {
                    "type": "number"
                  },
                  "yaw": {
                    "type": "number"
                  },
                  "center": {
                    "type": "string",
                    "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                  }
                },
                "required": [
                  "roll",
                  "pitch",
                  "yaw"
                ],
                "additionalProperties": false
              },
              "rotate_by_matrix": {
                "type": "object",
                "description": "回転行列の行（正規直交で行列式 +1。鏡映は不可）。点 p は R p に移る",
                "properties": {
                  "row_1": {
                    "type": "string",
                    "description": "\"x y z\"（空白区切りの 3 つの数）"
                  },
                  "row_2": {
                    "type": "string",
                    "description": "\"x y z\"（空白区切りの 3 つの数）"
                  },
                  "row_3": {
                    "type": "string",
                    "description": "\"x y z\"（空白区切りの 3 つの数）"
                  },
                  "center": {
                    "type": "string",
                    "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                  }
                },
                "required": [
                  "row_1",
                  "row_2",
                  "row_3"
                ],
                "additionalProperties": false
              },
              "translate": {
                "type": "string",
                "description": "平行移動ベクトル \"x y z\""
              }
            },
            "minProperties": 1,
            "maxProperties": 1
          },
          minItems: 1
        }
      },
      required: ['name', 'operations']
    }
  },
  {
    name: 'poker_updateTransform',
    description: '既存変換の操作を更新します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '更新する変換名'
        },
        operations: {
          type: 'array',
          description: '新しい変換操作の配列',
          items: {
            "type": "object",
            "properties": {
              "rotate_around_x": {
                "anyOf": [
                  {
                    "type": "number",
                    "description": "角度（unit.angle の単位）"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "angle": {
                        "type": "number"
                      },
                      "center": {
                        "type": "string",
                        "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                      }
                    },
                    "required": [
                      "angle"
                    ],
                    "additionalProperties": false
                  }
                ],
                "description": "x 軸の周りに回す：角度、または {angle, center}"
              },
              "rotate_around_y": {
                "anyOf": [
                  {
                    "type": "number",
                    "description": "角度（unit.angle の単位）"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "angle": {
                        "type": "number"
                      },
                      "center": {
                        "type": "string",
                        "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                      }
                    },
                    "required": [
                      "angle"
                    ],
                    "additionalProperties": false
                  }
                ],
                "description": "y 軸の周りに回す：角度、または {angle, center}"
              },
              "rotate_around_z": {
                "anyOf": [
                  {
                    "type": "number",
                    "description": "角度（unit.angle の単位）"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "angle": {
                        "type": "number"
                      },
                      "center": {
                        "type": "string",
                        "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                      }
                    },
                    "required": [
                      "angle"
                    ],
                    "additionalProperties": false
                  }
                ],
                "description": "z 軸の周りに回す：角度、または {angle, center}"
              },
              "rotate_by_axis_angle": {
                "type": "object",
                "description": "任意の向きの軸の周りに回す",
                "properties": {
                  "axis": {
                    "type": "string",
                    "description": "\"x y z\"（空白区切りの 3 つの数）"
                  },
                  "angle": {
                    "type": "number"
                  },
                  "center": {
                    "type": "string",
                    "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                  }
                },
                "required": [
                  "axis",
                  "angle"
                ],
                "additionalProperties": false
              },
              "rotate_by_euler": {
                "type": "object",
                "description": "オイラー角。sequence = ABC、angles = \"a b c\" として、intrinsic（回ってできた軸の周りに順に）は R = R_A(a)·R_B(b)·R_C(c)、extrinsic（最初の座標軸の周りに順に）は R = R_C(c)·R_B(b)·R_A(a)",
                "properties": {
                  "sequence": {
                    "enum": [
                      "xyz",
                      "xzy",
                      "yxz",
                      "yzx",
                      "zxy",
                      "zyx",
                      "xyx",
                      "xzx",
                      "yxy",
                      "yzy",
                      "zxz",
                      "zyz"
                    ]
                  },
                  "angles": {
                    "type": "string",
                    "description": "1・2・3 番目の軸の周りの角度 \"a b c\""
                  },
                  "frame": {
                    "enum": [
                      "intrinsic",
                      "extrinsic"
                    ]
                  },
                  "center": {
                    "type": "string",
                    "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                  }
                },
                "required": [
                  "sequence",
                  "angles",
                  "frame"
                ],
                "additionalProperties": false
              },
              "rotate_by_rpy": {
                "type": "object",
                "description": "ロール・ピッチ・ヨー：固定した座標軸の周りに x（roll）→ y（pitch）→ z（yaw）の順に回す。R = Rz(yaw)·Ry(pitch)·Rx(roll)",
                "properties": {
                  "roll": {
                    "type": "number"
                  },
                  "pitch": {
                    "type": "number"
                  },
                  "yaw": {
                    "type": "number"
                  },
                  "center": {
                    "type": "string",
                    "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                  }
                },
                "required": [
                  "roll",
                  "pitch",
                  "yaw"
                ],
                "additionalProperties": false
              },
              "rotate_by_matrix": {
                "type": "object",
                "description": "回転行列の行（正規直交で行列式 +1。鏡映は不可）。点 p は R p に移る",
                "properties": {
                  "row_1": {
                    "type": "string",
                    "description": "\"x y z\"（空白区切りの 3 つの数）"
                  },
                  "row_2": {
                    "type": "string",
                    "description": "\"x y z\"（空白区切りの 3 つの数）"
                  },
                  "row_3": {
                    "type": "string",
                    "description": "\"x y z\"（空白区切りの 3 つの数）"
                  },
                  "center": {
                    "type": "string",
                    "description": "回転の中心 \"x y z\"（長さは unit.length）。省くと原点の周り"
                  }
                },
                "required": [
                  "row_1",
                  "row_2",
                  "row_3"
                ],
                "additionalProperties": false
              },
              "translate": {
                "type": "string",
                "description": "平行移動ベクトル \"x y z\""
              }
            },
            "minProperties": 1,
            "maxProperties": 1
          }
        }
      },
      required: ['name']
    }
  },
  {
    name: 'poker_deleteTransform',
    description: '変換を削除します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '削除する変換名'
        }
      },
      required: ['name']
    }
  }
];
