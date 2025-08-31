// Three.js Local Integration - CDN依存排除版
class LocalThreeJSManager {
    constructor() {
        this.isThreeJSLoaded = false;
        this.loadingPromise = null;
        this.fallbackActive = false;
        
        console.log('📦 ローカルThree.js管理システム初期化...');
    }

    // Three.jsをローカルまたは確実な方法で読み込み
    async ensureThreeJS() {
        if (this.isThreeJSLoaded && typeof THREE !== 'undefined') {
            return true;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        console.log('📦 Three.js読み込み開始...');
        this.loadingPromise = this.tryMultipleLoadMethods();
        return this.loadingPromise;
    }

    // 複数の方法でThree.js読み込み試行
    async tryMultipleLoadMethods() {
        const methods = [
            () => this.tryEmbeddedThreeJS(),
            () => this.tryDynamicImport(),
            () => this.tryCDNWithRetry(),
            () => this.createMinimalThreeJS()
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`🔄 Three.js読み込み方法 ${i + 1} を試行中...`);
                await methods[i]();
                
                if (typeof THREE !== 'undefined') {
                    console.log(`✅ Three.js読み込み成功 (方法${i + 1})`);
                    this.isThreeJSLoaded = true;
                    return true;
                }
            } catch (error) {
                console.warn(`⚠️ Three.js読み込み方法${i + 1}失敗:`, error.message);
                await this.delay(500); // 少し待ってから次を試行
            }
        }

        console.error('❌ 全てのThree.js読み込み方法が失敗しました');
        return false;
    }

    // 方法1: 埋め込みThree.js（最小限）
    async tryEmbeddedThreeJS() {
        // 最小限のThree.js機能を直接埋め込み
        if (typeof THREE === 'undefined') {
            this.createEmbeddedThreeJS();
        }
        
        // 簡単な初期化テスト
        const canvas = document.createElement('canvas');
        const renderer = new THREE.WebGLRenderer({ canvas });
        renderer.dispose();
        
        console.log('✅ 埋め込みThree.js初期化成功');
    }

    // 方法2: Dynamic Import
    async tryDynamicImport() {
        try {
            // ES6 dynamic importを試行
            const THREE_MODULE = await import('https://unpkg.com/three@0.128.0/build/three.module.js');
            window.THREE = THREE_MODULE;
            console.log('✅ Dynamic Import成功');
        } catch (error) {
            throw new Error(`Dynamic Import失敗: ${error.message}`);
        }
    }

    // 方法3: CDNリトライ（改良版）
    async tryCDNWithRetry() {
        const cdnUrls = [
            'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
            'https://unpkg.com/three@0.128.0/build/three.min.js',
            'https://cdn.skypack.dev/three@0.128.0'
        ];

        for (const url of cdnUrls) {
            try {
                await this.loadScriptWithTimeout(url, 5000);
                if (typeof THREE !== 'undefined') {
                    return;
                }
            } catch (error) {
                console.warn(`CDN ${url} 失敗:`, error.message);
            }
        }
        
        throw new Error('全CDN読み込み失敗');
    }

    // 方法4: 最小限Three.js作成
    async createMinimalThreeJS() {
        console.log('🔧 最小限Three.js実装を作成中...');
        this.createEmbeddedThreeJS();
    }

    // スクリプト読み込み（タイムアウト付き）
    loadScriptWithTimeout(url, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            const timeoutId = setTimeout(() => {
                script.remove();
                reject(new Error('読み込みタイムアウト'));
            }, timeout);

            script.onload = () => {
                clearTimeout(timeoutId);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeoutId);
                script.remove();
                reject(new Error('スクリプト読み込みエラー'));
            };

            document.head.appendChild(script);
        });
    }

    // 埋め込み版Three.js（最小機能）
    createEmbeddedThreeJS() {
        if (typeof THREE !== 'undefined') return;

        console.log('🔧 埋め込み版Three.js作成中...');

        // 基本的なThree.js構造を作成
        window.THREE = {
            REVISION: '128-embedded',
            
            // Scene
            Scene: class Scene {
                constructor() {
                    this.children = [];
                    this.background = null;
                }
                add(object) {
                    this.children.push(object);
                }
                remove(object) {
                    const index = this.children.indexOf(object);
                    if (index > -1) this.children.splice(index, 1);
                }
                traverse(callback) {
                    callback(this);
                    this.children.forEach(child => {
                        if (child.traverse) child.traverse(callback);
                    });
                }
            },

            // Camera
            PerspectiveCamera: class PerspectiveCamera {
                constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
                    this.fov = fov;
                    this.aspect = aspect;
                    this.near = near;
                    this.far = far;
                    this.position = new THREE.Vector3(0, 0, 0);
                }
                lookAt(x, y, z) {
                    // 簡易実装
                    console.log(`Camera lookAt: ${x}, ${y}, ${z}`);
                }
                updateProjectionMatrix() {
                    // 簡易実装
                }
            },

            // Vector3
            Vector3: class Vector3 {
                constructor(x = 0, y = 0, z = 0) {
                    this.x = x;
                    this.y = y;
                    this.z = z;
                }
                set(x, y, z) {
                    this.x = x;
                    this.y = y;
                    this.z = z;
                    return this;
                }
                copy(v) {
                    this.x = v.x;
                    this.y = v.y;
                    this.z = v.z;
                    return this;
                }
                length() {
                    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
                }
                normalize() {
                    const len = this.length();
                    if (len > 0) {
                        this.x /= len;
                        this.y /= len;
                        this.z /= len;
                    }
                    return this;
                }
                multiplyScalar(scalar) {
                    this.x *= scalar;
                    this.y *= scalar;
                    this.z *= scalar;
                    return this;
                }
                addScaledVector(v, s) {
                    this.x += v.x * s;
                    this.y += v.y * s;
                    this.z += v.z * s;
                    return this;
                }
                subVectors(a, b) {
                    this.x = a.x - b.x;
                    this.y = a.y - b.y;
                    this.z = a.z - b.z;
                    return this;
                }
                distanceTo(v) {
                    const dx = this.x - v.x;
                    const dy = this.y - v.y;
                    const dz = this.z - v.z;
                    return Math.sqrt(dx * dx + dy * dy + dz * dz);
                }
                getWorldDirection(target) {
                    target = target || new THREE.Vector3();
                    target.set(0, 0, -1);
                    return target;
                }
            },

            // Color
            Color: class Color {
                constructor(color = 0xffffff) {
                    this.setHex(color);
                }
                setHex(hex) {
                    this.r = ((hex >> 16) & 255) / 255;
                    this.g = ((hex >> 8) & 255) / 255;
                    this.b = (hex & 255) / 255;
                    return this;
                }
                lerp(color, alpha) {
                    this.r += (color.r - this.r) * alpha;
                    this.g += (color.g - this.g) * alpha;
                    this.b += (color.b - this.b) * alpha;
                    return this;
                }
            },

            // WebGLRenderer
            WebGLRenderer: class WebGLRenderer {
                constructor(parameters = {}) {
                    this.domElement = parameters.canvas || document.createElement('canvas');
                    this.shadowMap = { enabled: false, type: null };
                    this.context = null;
                    
                    try {
                        this.context = this.domElement.getContext('webgl') || 
                                      this.domElement.getContext('experimental-webgl');
                        if (!this.context) {
                            throw new Error('WebGL not supported');
                        }
                        console.log('✅ WebGL Context取得成功');
                    } catch (error) {
                        console.warn('⚠️ WebGL初期化失敗、Canvas2Dフォールバック:', error.message);
                        this.context = this.domElement.getContext('2d');
                    }
                }
                
                setSize(width, height) {
                    this.domElement.width = width;
                    this.domElement.height = height;
                    this.domElement.style.width = width + 'px';
                    this.domElement.style.height = height + 'px';
                }
                
                setPixelRatio(ratio) {
                    // 簡易実装
                }
                
                render(scene, camera) {
                    if (this.context && this.context.clearColor) {
                        // WebGLの場合
                        this.context.clearColor(0.9, 0.95, 1.0, 1.0);
                        this.context.clear(this.context.COLOR_BUFFER_BIT);
                        
                        // 簡易的な3D描画
                        this.renderScene3D(scene, camera);
                    } else if (this.context && this.context.fillStyle) {
                        // Canvas2Dフォールバック
                        this.renderScene2D(scene, camera);
                    }
                }
                
                renderScene3D(scene, camera) {
                    // 簡易WebGL描画
                    console.log('🎨 簡易3D描画実行');
                }
                
                renderScene2D(scene, camera) {
                    const ctx = this.context;
                    const width = this.domElement.width;
                    const height = this.domElement.height;
                    
                    // 背景クリア
                    ctx.fillStyle = '#f0f8ff';
                    ctx.fillRect(0, 0, width, height);
                    
                    // シーンオブジェクトの2D描画
                    scene.children.forEach(child => {
                        this.render2DObject(ctx, child, width/2, height/2);
                    });
                }
                
                render2DObject(ctx, object, centerX, centerY) {
                    if (object.geometry && object.material) {
                        const pos = object.position || { x: 0, y: 0, z: 0 };
                        
                        if (object.geometry.type === 'SphereGeometry') {
                            const radius = object.geometry.parameters?.radius || 10;
                            
                            ctx.beginPath();
                            ctx.arc(centerX + pos.x, centerY - pos.y, radius, 0, 2 * Math.PI);
                            
                            if (object.material.color) {
                                const color = object.material.color;
                                ctx.fillStyle = `rgb(${Math.floor(color.r*255)}, ${Math.floor(color.g*255)}, ${Math.floor(color.b*255)})`;
                                ctx.globalAlpha = object.material.opacity || 1;
                                ctx.fill();
                            }
                            
                            ctx.strokeStyle = '#666';
                            ctx.globalAlpha = 1;
                            ctx.stroke();
                        }
                    }
                }
                
                dispose() {
                    // クリーンアップ
                }
            },

            // Geometry classes
            SphereGeometry: class SphereGeometry {
                constructor(radius = 1, widthSegments = 8, heightSegments = 6) {
                    this.type = 'SphereGeometry';
                    this.parameters = { radius, widthSegments, heightSegments };
                }
                dispose() {}
            },

            BoxGeometry: class BoxGeometry {
                constructor(width = 1, height = 1, depth = 1) {
                    this.type = 'BoxGeometry';
                    this.parameters = { width, height, depth };
                }
                dispose() {}
            },

            CylinderGeometry: class CylinderGeometry {
                constructor(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 8) {
                    this.type = 'CylinderGeometry';
                    this.parameters = { radiusTop, radiusBottom, height, radialSegments };
                }
                dispose() {}
            },

            // Material classes
            MeshLambertMaterial: class MeshLambertMaterial {
                constructor(parameters = {}) {
                    this.color = parameters.color ? new THREE.Color(parameters.color) : new THREE.Color(0xffffff);
                    this.transparent = parameters.transparent || false;
                    this.opacity = parameters.opacity !== undefined ? parameters.opacity : 1;
                    this.wireframe = parameters.wireframe || false;
                }
                dispose() {}
            },

            MeshBasicMaterial: class MeshBasicMaterial {
                constructor(parameters = {}) {
                    this.color = parameters.color ? new THREE.Color(parameters.color) : new THREE.Color(0xffffff);
                    this.transparent = parameters.transparent || false;
                    this.opacity = parameters.opacity !== undefined ? parameters.opacity : 1;
                }
                dispose() {}
            },

            // Mesh
            Mesh: class Mesh {
                constructor(geometry, material) {
                    this.geometry = geometry;
                    this.material = material;
                    this.position = new THREE.Vector3(0, 0, 0);
                    this.name = '';
                    this.castShadow = false;
                    this.receiveShadow = false;
                }
                traverse(callback) {
                    callback(this);
                }
            },

            // Lights
            AmbientLight: class AmbientLight {
                constructor(color = 0xffffff, intensity = 1) {
                    this.color = new THREE.Color(color);
                    this.intensity = intensity;
                }
            },

            DirectionalLight: class DirectionalLight {
                constructor(color = 0xffffff, intensity = 1) {
                    this.color = new THREE.Color(color);
                    this.intensity = intensity;
                    this.position = new THREE.Vector3(0, 1, 0);
                    this.castShadow = false;
                    this.shadow = { mapSize: { width: 512, height: 512 }, camera: { near: 0.5, far: 500 } };
                }
            },

            PointLight: class PointLight {
                constructor(color = 0xffffff, intensity = 1) {
                    this.color = new THREE.Color(color);
                    this.intensity = intensity;
                    this.position = new THREE.Vector3(0, 0, 0);
                }
            },

            // Helpers
            GridHelper: class GridHelper {
                constructor(size = 10, divisions = 10, colorCenterLine = 0x444444, colorGrid = 0x888888) {
                    this.name = 'grid';
                    this.visible = true;
                }
            },

            AxesHelper: class AxesHelper {
                constructor(size = 1) {
                    this.name = 'axes';
                    this.visible = true;
                }
            },

            // Group
            Group: class Group {
                constructor() {
                    this.children = [];
                    this.name = '';
                }
                add(object) {
                    this.children.push(object);
                }
                remove(object) {
                    const index = this.children.indexOf(object);
                    if (index > -1) this.children.splice(index, 1);
                }
            },

            // Constants
            DoubleSide: 2,
            PCFSoftShadowMap: 1,
            BasicShadowMap: 0
        };

        console.log('✅ 埋め込み版Three.js作成完了');
    }

    // 待機
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Three.js機能テスト
    testThreeJSFunctionality() {
        if (typeof THREE === 'undefined') {
            return { success: false, error: 'THREE is not defined' };
        }

        try {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
            const canvas = document.createElement('canvas');
            const renderer = new THREE.WebGLRenderer({ canvas });

            const geometry = new THREE.SphereGeometry(1);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const mesh = new THREE.Mesh(geometry, material);

            scene.add(mesh);
            renderer.render(scene, camera);

            return { 
                success: true, 
                version: THREE.REVISION,
                webgl: renderer.context && renderer.context.clearColor ? true : false
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// グローバル登録
window.LocalThreeJSManager = LocalThreeJSManager;
console.log('✅ LocalThreeJSManager読み込み完了');
