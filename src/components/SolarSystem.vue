<script setup lang="ts">
import {
  AmbientLight,
  AxesHelper,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import WEBGL from 'three/examples/jsm/capabilities/WebGL';
import Stats from 'stats.js';
import isWebGLAvailable = WEBGL.isWebGLAvailable;
import getWebGLErrorMessage = WEBGL.getWebGLErrorMessage;
import { isMobileDevice } from '../utils';

// 最终版本需要实现功能：
// 1. 默认第三人称控制，PC 可切换至第一人称
// 2. 支持自定义环境光（要有光）
// 3. 第三人称模式下支持跳转至指定的行星轨道；可选择成为卫星或不成为卫星
// 4. 支持对当前帧截图生成壁纸；后续考虑生成 gif
// 5. 增加行星自转开关，可关闭行星自转，默认开启
// 6. 尝试增加碰撞检测！！！？？？

interface PlanetType {
  cnName: string;
  name: string;
  distance: number;
  rotationSpeed: number;
  revolutionSpeed: number;
  sizeScale: number;
}
type PlanetTypes = Array<PlanetType>;
type ModeType = 'third-person' | 'first-person';

let controls: PointerLockControls | OrbitControls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();

const velocity = new Vector3();
const direction = new Vector3();

const mode = ref<ModeType>('third-person');
const loadingText = ref(''); // 加载文字
const moveSpeed = ref(50000); // 第一人称移动速度
const showModeSelect = ref(true); // 是否显示选择模式按钮
const switchRotation = ref(true); // 是否开启星球自转
const loadedPlanets = reactive<Group[]>([]); // 已加载的星球模型

// 1个天文单位
const AU = 14959787000;
// 距离比例 Math.floor((AU * 1000) / 6371)
const distanceScale = Math.floor(AU / 6371); // AU 应该再 * 1000 的，但为了视觉效果，暂时不乘
const { innerWidth, innerHeight } = window;

const stats = new Stats();
const scene = new Scene();
const camera = new PerspectiveCamera(25, innerWidth / innerHeight, 0.1, Number.MAX_SAFE_INTEGER);
const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// 直线灯光，模拟太阳光
const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(-1, 0, 0);
const ambientLight = new AmbientLight(0xffffff, 0.08);
const axes = new AxesHelper(Number.MAX_SAFE_INTEGER);
// scene.add(axes);
// scene.add(ambientLight);
scene.add(directionalLight);

const loader = new GLTFLoader();

const plants: PlanetTypes = [
  {
    cnName: '太阳',
    name: 'sun',
    distance: 0,
    rotationSpeed: 0,
    revolutionSpeed: 0.004,
    sizeScale: 30,
  },
  {
    cnName: '水星',
    name: 'mercury',
    distance: distanceScale * 0.4,
    rotationSpeed: 0.015,
    revolutionSpeed: 0.002,
    sizeScale: 0.383,
  },
  {
    cnName: '金星',
    name: 'venus',
    distance: distanceScale * 0.7,
    rotationSpeed: 0.0065,
    revolutionSpeed: 0.005,
    sizeScale: 0.95,
  },
  { cnName: '地球', name: 'earth', distance: distanceScale, rotationSpeed: 0.05, revolutionSpeed: 0.01, sizeScale: 1 },
  {
    cnName: '火星',
    name: 'mars',
    distance: distanceScale * 1.5,
    rotationSpeed: 0.03,
    revolutionSpeed: 0.01,
    sizeScale: 0.532,
  },
];

function loadPlanet(planet: PlanetType) {
  return new Promise<GLTF>((resolve, reject) => {
    loader.load(
      `models/${planet.name}.glb`,
      (GLTF: GLTF) => {
        resolve(GLTF);
      },
      (xhr) => {
        const percent = (xhr.loaded / xhr.total) * 100;
        if (typeof percent === 'number' && percent <= 100) {
          loadingText.value = `${planet.cnName}加载中...${percent.toFixed(2)}%`;
        }
      },
      (error) => {
        reject(error);
      },
    );
  });
}

function loadPlanets() {
  plants.forEach(async (planet: PlanetType) => {
    try {
      const { scene: plantGroup } = await loadPlanet(planet);
      plantGroup.name = planet.name;
      plantGroup.scale.setScalar(planet.sizeScale);
      plantGroup.position.set(planet.distance, 0, 0);
      if (mode.value === 'third-person') {
        loadedPlanets.push(plantGroup);
      }
      const parentGroup = new Group();
      parentGroup.add(plantGroup);
      scene.add(parentGroup);
    } catch (error) {
      console.error(error);
    } finally {
      loadingText.value = '';
    }
  });
}

function updateCamera(position: Vector3) {
  camera.position.copy(position);
  camera.updateProjectionMatrix();
  if (controls instanceof OrbitControls) {
    controls.update();
  }
}
watch(loadedPlanets, (value) => {
  // 按距离由近到远排序
  value.sort((a, b) => {
    return a.position.x - b.position.x;
  });
  const lastPlanet = value[value.length - 1];
  if (lastPlanet) {
    const {
      position: { x, y, z },
    } = lastPlanet;
    const vector3 = new Vector3(x + 5000, y + 500, z);
    if (controls instanceof OrbitControls) {
      controls.target.set(x, y, z);
    }
    updateCamera(vector3);
  }
});

function onKeyDown(event: KeyboardEvent) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;

    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;

    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;

    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;

    case 'Space':
      if (canJump === true) velocity.y += 350;
      canJump = false;
      break;
    default:
      break;
  }
}
function onKeyUp(event: KeyboardEvent) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;

    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;

    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;

    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
    default:
      break;
  }
}

function startFirstPersonMode() {
  const time = performance.now();

  if (controls instanceof PointerLockControls && controls.isLocked === true) {
    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed.value * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed.value * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta; // new behavior

    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;
      canJump = true;
    }
  }

  prevTime = time;
}
function startThirdPersonMode() {
  if (switchRotation.value) {
    const planetNames = plants.map((planet) => planet.name);
    scene.traverse((object: Object3D) => {
      if (object.name && planetNames.includes(object.name)) {
        const plantGroup = object as Group;
        const planet = plants.find((planet) => planet.name === plantGroup.name);
        if (planet) {
          // eslint-disable-next-line no-param-reassign
          plantGroup.rotation.y += planet.revolutionSpeed * 0.05;
        }
      }
    });
  }
}
function animate() {
  requestAnimationFrame(animate);
  if (mode.value === 'first-person') {
    startFirstPersonMode();
  } else {
    startThirdPersonMode();
  }
  if (controls instanceof OrbitControls) {
    controls.update();
  }
  renderer.render(scene, camera);
  stats.update();
}

function initFirstPersonMode() {
  // 初始化控制器
  controls = new PointerLockControls(camera, document.body);
  const blocker = document.getElementById('blocker');
  const instructions = document.getElementById('instructions');
  if (blocker && instructions) {
    instructions.addEventListener('click', function () {
      if (controls instanceof PointerLockControls) {
        controls.lock();
      }
    });
    controls.addEventListener('lock', function () {
      instructions.style.display = 'none';
      blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
      blocker.style.display = 'block';
      instructions.style.display = '';
    });
    scene.add(controls.getObject());

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }
  // todo: 设置理想的摄像机位置
  updateCamera(new Vector3(0, 0, 200000));
}

function initThirdPersonMode() {
  // camera.up.set(0, 0, -1);
  // 初始化控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(document.body);
  controls.rotateSpeed = 0.2;
  controls.zoomSpeed = 0.5;
  // 初始化相机位置
  updateCamera(new Vector3(200000, 0, 12000));
  // 添加环境光
  const ambientLight = new AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
}

function init() {
  const solarSystemContainer = document.getElementById('solar-system') as HTMLElement;
  solarSystemContainer.appendChild(renderer.domElement);
  loadPlanets();
  document.body.appendChild(stats.dom);
  if (mode.value === 'first-person') {
    initFirstPersonMode();
  } else {
    initThirdPersonMode();
  }
  if (isWebGLAvailable()) {
    animate();
  } else {
    const warning = getWebGLErrorMessage();
    solarSystemContainer.appendChild(warning);
  }
}

function setStartBackground(scene: Scene) {
  // 生成繁星背景
  const r = Number.MAX_SAFE_INTEGER;
  const starsGeometry = [new BufferGeometry(), new BufferGeometry()];

  const vertices1 = [];
  const vertices2 = [];

  const vertex = new Vector3();

  for (let i = 0; i < 250; i += 1) {
    vertex.x = Math.random() * 2 - 1;
    vertex.y = Math.random() * 2 - 1;
    vertex.z = Math.random() * 2 - 1;
    vertex.multiplyScalar(r);

    vertices1.push(vertex.x, vertex.y, vertex.z);
  }

  for (let i = 0; i < 1500; i += 1) {
    vertex.x = Math.random() * 2 - 1;
    vertex.y = Math.random() * 2 - 1;
    vertex.z = Math.random() * 2 - 1;
    vertex.multiplyScalar(r);

    vertices2.push(vertex.x, vertex.y, vertex.z);
  }

  starsGeometry[0].setAttribute('position', new Float32BufferAttribute(vertices1, 3));
  starsGeometry[1].setAttribute('position', new Float32BufferAttribute(vertices2, 3));

  const starsMaterials = [
    new PointsMaterial({ color: 0x555555, size: 2, sizeAttenuation: false }),
    new PointsMaterial({ color: 0x555555, size: 1, sizeAttenuation: false }),
    new PointsMaterial({ color: 0x333333, size: 2, sizeAttenuation: false }),
    new PointsMaterial({ color: 0x3a3a3a, size: 1, sizeAttenuation: false }),
    new PointsMaterial({ color: 0x1a1a1a, size: 2, sizeAttenuation: false }),
    new PointsMaterial({ color: 0x1a1a1a, size: 1, sizeAttenuation: false }),
  ];

  for (let i = 10; i < 30; i += 1) {
    const stars = new Points(starsGeometry[i % 2], starsMaterials[i % 6]);

    stars.rotation.x = Math.random() * 6;
    stars.rotation.y = Math.random() * 6;
    stars.rotation.z = Math.random() * 6;
    stars.scale.setScalar(i * 10);

    stars.matrixAutoUpdate = false;
    stars.updateMatrix();

    scene.add(stars);
  }
}
setStartBackground(scene);
function selectMode(selectedMode: ModeType) {
  showModeSelect.value = false;
  mode.value = selectedMode;
  init();
}
onMounted(() => {
  if (isMobileDevice()) {
    showModeSelect.value = false;
    mode.value = 'third-person';
    init();
  }
  // todo: 开发完注释掉
  // else {
  //   selectMode('third-person');
  // }
});

function screenshot() {
  //  在截图之前先渲染一下场景和相机，就不会实时刷新屏幕，导致截屏下来的是空白了
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = 'solar-system.png';
  a.click();
}

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.ctrlKey && event.code === 'KeyA') {
    screenshot();
  }
});
</script>

<template>
  <div class="relative bg-black">
    <p v-if="loadingText" class="color-#fff absolute top-0 left-50% translate-x&#45;&#45;1/2 z-2">
      {{ loadingText }}
    </p>
    <div v-if="showModeSelect" class="custom-bg w-100vw h-100vh flex flex-col justify-center items-center">
      <div class="flex justify-center items-center glass w-full h-full relative">
        <h1 class="color-#fff absolute">选择操作模式</h1>
        <div class="card color-#fff" @click="selectMode('first-person')">第一人称视角</div>
        <div class="card color-#fff" @click="selectMode('third-person')">第三人视角</div>
      </div>
    </div>
    <button class="absolute top-0 right-150px" @click="switchRotation = !switchRotation">
      {{ switchRotation ? '关闭' : '开启' }}自转
    </button>
    <button class="absolute right-0 top-0" @click="screenshot">
      生成壁纸<template v-if="!isMobileDevice()">(ctrl + A)</template>
    </button>
    <div v-show="mode === 'first-person'" id="blocker" class="absolute w-full h-full bg-black/50">
      <div
        id="instructions"
        class="w-full h-full flex cursor-pointer fontSize-14px justify-center items-center flex-col"
      >
        <p style="font-size: 36px">点击开始</p>
        <p>
          移动: WASD<br />
          暂停: ESC<br />
        </p>
      </div>
    </div>
    <div id="solar-system"></div>
  </div>
</template>

<style scoped>
.custom-bg {
  background-image: url('src/assets/images/bg.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
.glass {
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  background-color: rgba(17, 25, 40, 0.54);
}
.card {
  backdrop-filter: blur(15px) saturate(180%);
  -webkit-backdrop-filter: blur(15px) saturate(180%);
  background-color: rgba(0, 0, 0, 0.54);
  border-radius: 12px;
  height: 200px;
  border: 1px solid rgba(255, 255, 255, 0.125);
  cursor: pointer;
}
</style>
