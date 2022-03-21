<script setup lang="ts">
import { effect } from 'vue';
import {
  AmbientLight,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  PerspectiveCamera,
  Plane,
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

interface PlantType {
  cnName: string;
  name: string;
  distance: number;
  rotationSpeed: number;
  revolutionSpeed: number;
  sizeScale: number;
}
type PlantTypes = Array<PlantType>;
type ModeType = 'third-person' | 'first-person';

// 天文单位
const AU = 1495978700;
// 距离比例 Math.floor((AU * 1000) / 6371)
const distanceScale = Math.floor(AU / 6371);

const loadingTextList = ref<string[]>([]);
const loadingText = ref('');
let controls: PointerLockControls | OrbitControls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new Vector3();
const direction = new Vector3();
const { innerWidth, innerHeight } = window;

const mode = ref<ModeType>('third-person');
const moveSpeed = ref(50000);
const showModeSelect = ref(true);

const stats = new Stats();
const scene = new Scene();
const camera = new PerspectiveCamera(25, innerWidth / innerHeight, 0.1, Number.MAX_SAFE_INTEGER);
const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(-1, 0, 0);
const ambientLight = new AmbientLight(0xffffff, 0.08);
scene.add(ambientLight);
scene.add(directionalLight);

const loader = new GLTFLoader();

const plants: PlantTypes = [
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

function loadPlanet(plant: PlantType) {
  return new Promise<GLTF>((resolve, reject) => {
    loader.load(
      `models/${plant.name}.glb`,
      (GLTF: GLTF) => {
        resolve(GLTF);
      },
      (xhr) => {
        const percent = (xhr.loaded / xhr.total) * 100;
        if (percent === 100) {
          // loadingTextList.value.push(`${plant.cnName}加载完成`);
        } else {
          // loadingTextList.value.push(`${plant.cnName}加载中...${percent.toFixed(2)}%`);
        }
        loadingText.value = `${plant.cnName}加载中...${percent.toFixed(2)}%`;
      },
      (error) => {
        reject(error);
      },
    );
  });
}

function loadPlanets() {
  plants.forEach(async (plant: PlantType) => {
    try {
      const { scene: plantGroup } = await loadPlanet(plant);
      plantGroup.name = plant.name;
      plantGroup.scale.setScalar(plant.sizeScale);
      plantGroup.position.set(plant.distance, 0, 0);
      const parentGroup = new Group();
      parentGroup.add(plantGroup);
      scene.add(parentGroup);
    } catch (error) {
      console.error(error);
    } finally {
      // todo: 加载完成后清除loadingTextList
      loadingText.value = '';
    }
  });
}
loadPlanets();
function updateCamera(camera: PerspectiveCamera, position: Vector3) {
  camera.position.copy(position);
  if (controls instanceof OrbitControls) {
    controls.update();
  }
}

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
function setControls() {
  if (mode.value === 'first-person') {
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
  } else {
    controls = new OrbitControls(camera, renderer.domElement);
    // controls.update() // must be called after any manual changes to the camera's transform
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

function animate() {
  requestAnimationFrame(animate);
  if (mode.value === 'first-person') {
    startFirstPersonMode();
  }
  renderer.render(scene, camera);
  stats.update();
}

function initFirstPersonMode() {
  // todo: 设置理想的摄像机位置
  updateCamera(camera, new Vector3(-5000, 0, 200000));
}

function initThirdPersonMode() {
  // todo: 根据选择的行星设置摄像机的位置
  updateCamera(camera, new Vector3(200000, 0, 12000));
  const plantNames = plants.map((p) => p.name);
  scene.traverse((object) => {
    if (object.name && plantNames.includes(object.name)) {
      console.log('traverse', object);
    }
  });
  const ambientLight = new AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
}

function init() {
  const solarSystemContainer = document.getElementById('solar-system') as HTMLElement;
  solarSystemContainer.appendChild(renderer.domElement);
  document.body.appendChild(stats.dom);
  if (mode.value === 'first-person') {
    initFirstPersonMode();
  } else {
    initThirdPersonMode();
  }
  setControls();
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
  } else {
    selectMode('third-person');
  }
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
  <div class="relative">
    <!--    <div-->
    <!--      v-if="loadingTextList.length"-->
    <!--      class="max-h-200px overflow-scroll color-#fff absolute top-0 left-50% translate-x&#45;&#45;1/2 z-2"-->
    <!--    >-->
    <!--      <p v-for="text in loadingTextList" :key="text" class="font-size-20">{{ text }}</p>-->
    <!--    </div>-->
    <p v-if="loadingText" class="color-#fff absolute top-0 left-50% translate-x&#45;&#45;1/2 z-2">
      {{ loadingText }}
    </p>
    <div v-if="showModeSelect" class="w-100vw h-100vh color-#fff absolute left-50% translate-x--1/2 bg-gray-700/20">
      选择模式：
      <button @click="selectMode('third-person')">上帝视角</button>
      <button @click="selectMode('first-person')">第一人称视角</button>
    </div>
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
          Move: WASD<br />
          Jump: SPACE<br />
          Look: MOUSE
        </p>
      </div>
    </div>
    <div id="solar-system"></div>
  </div>
</template>

<style scoped></style>
