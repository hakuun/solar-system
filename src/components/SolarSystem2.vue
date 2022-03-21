<script setup lang="ts">
import { effect } from 'vue';
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  Group,
  PointsMaterial,
  Points,
  Float32BufferAttribute,
  BufferGeometry,
  Vector3,
  PointLight,
  TorusGeometry,
  Mesh,
  MeshBasicMaterial,
  AxesHelper,
  Object3D,
} from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import WEBGL from 'three/examples/jsm/capabilities/WebGL';
import Stats from 'stats.js';
import isWebGLAvailable = WEBGL.isWebGLAvailable;
import getWebGLErrorMessage = WEBGL.getWebGLErrorMessage;

interface Planet {
  name: string;
  radius?: number;
  distance: number;
  rotationSpeed: number;
  revolutionSpeed: number;
  sizeScale?: number;
  modelSrc: string;
  group?: Group;
  parentGroup: Group;
}
type Planets = Planet[];
interface anyObject {
  [key: string]: any;
}

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new Vector3();
const direction = new Vector3();

// 天文单位
const AU = 1495978700;
// 距离比例 Math.floor((AU * 1000) / 6371)
const distanceScale = Math.floor(AU / 6371);
// 移动速度
const moveSpeed = ref(50000);
// 相机位置
const cameraPosition = ref<Vector3>(new Vector3(0, 0, 220000));
const currentPlant = ref('sun');
const plants: Planets = [
  {
    name: 'sun',
    modelSrc: '/models/sun.glb',
    distance: 0,
    rotationSpeed: 0,
    revolutionSpeed: 0.004,
    parentGroup: new Group(),
    sizeScale: 109.5,
  },
  {
    name: 'mercury',
    modelSrc: '/models/mercury.glb',
    distance: distanceScale * 0.4,
    rotationSpeed: 0.015,
    revolutionSpeed: 0.002,
    parentGroup: new Group(),
    sizeScale: 0.383,
  },
  {
    name: 'venus',
    modelSrc: '/models/venus.glb',
    distance: distanceScale * 0.7,
    rotationSpeed: 0.0065,
    revolutionSpeed: 0.005,
    parentGroup: new Group(),
    sizeScale: 0.95,
  },
  {
    name: 'earth',
    modelSrc: '/models/earth.glb',
    distance: distanceScale,
    rotationSpeed: 0.05,
    revolutionSpeed: 0.01,
    parentGroup: new Group(),
    sizeScale: 1,
  },
  {
    name: 'mars',
    modelSrc: '/models/mars.glb',
    distance: distanceScale * 1.5,
    rotationSpeed: 0.03,
    revolutionSpeed: 0.01,
    parentGroup: new Group(),
    sizeScale: 0.532,
  },
  {
    name: 'jupiter',
    modelSrc: '/models/jupiter.glb',
    distance: distanceScale * 5.2,
    rotationSpeed: 0.01,
    revolutionSpeed: 0.08,
    parentGroup: new Group(),
    sizeScale: 10.97,
  },
  {
    name: 'saturn',
    modelSrc: '/models/saturn.glb',
    distance: distanceScale * 9.5,
    rotationSpeed: 0.02,
    revolutionSpeed: 1.5,
    parentGroup: new Group(),
    sizeScale: 9.14,
  },
  {
    name: 'uranus',
    modelSrc: '/models/uranus.glb',
    distance: distanceScale * 19.2,
    rotationSpeed: 0.09,
    revolutionSpeed: 1,
    parentGroup: new Group(),
    sizeScale: 3.95,
  },
  {
    name: 'neptune',
    modelSrc: '/models/neptune.glb',
    distance: distanceScale * 30.1,
    rotationSpeed: 0.01,
    revolutionSpeed: 0.1,
    parentGroup: new Group(),
    sizeScale: 3.87,
  },
];

const { innerWidth: width, innerHeight: height } = window;

function createScene(): Scene {
  const scene = new Scene();
  return scene;
}

function createCamera() {
  const camera = new PerspectiveCamera(25, width / height, 10, Number.MAX_SAFE_INTEGER);
  // camera.position.copy(cameraPosition.value);
  camera.position.z = 220000;
  return camera;
}

function createRenderer() {
  const renderer = new WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  return renderer;
}

function createDirectionalLight() {
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(-1, 0, 0);
  return light;
}

function createAxes() {
  const axes = new AxesHelper(Number.MAX_SAFE_INTEGER);
  return axes;
}
const stats = new Stats();
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
const ambientLight = new AmbientLight(0xffffff, 0.1);
const directionalLight = createDirectionalLight();
const loader = new GLTFLoader();
// 坐标系
const axes = createAxes();

scene.add(ambientLight);
scene.add(directionalLight);
scene.add(axes);
let controls: PointerLockControls;
effect(() => {
  camera.position.copy(cameraPosition.value);
  // camera.updateProjectionMatrix();
});

// eslint-disable-next-line no-shadow
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
function loadModel(plant: Planet) {
  return new Promise<Planet>((resolve, reject) => {
    loader.load(plant.modelSrc, (gltf: GLTF) => {
      const model = gltf.scene;
      // eslint-disable-next-line no-param-reassign
      plant.group = model;
      if (plant.sizeScale) {
        model.scale.setScalar(plant.sizeScale);
      }
      const light = new PointLight(0xffffffbe, 0.1, -plant.distance);
      // light.position.set(-plant.distance, 0, 0);
      scene.add(light);
      model.position.set(plant.distance, 0, 0);
      const geometry = new TorusGeometry(plant.distance, 100, 16, 100, Math.PI * 2);
      const material = new MeshBasicMaterial({ color: 0xffffff });
      const torus = new Mesh(geometry, material);
      torus.rotateX(77);
      plant.parentGroup.add(model);
      scene.add(torus);
      console.log(`正在加载${plant.name}`);
      resolve(plant);
    });
  });
}

// 加载模型
plants.forEach(async (plant) => {
  const loadedPlant = await loadModel(plant);
  console.log(`${loadedPlant.name}加载完成`);
  scene.add(loadedPlant.parentGroup);
});

function animate() {
  requestAnimationFrame(animate);
  // plants.forEach((plant) => {
  //   plant.parentGroup.rotation.set(0, plant.parentGroup.rotation.y + plant.rotationSpeed * 0.1, 0);
  //   plant?.group?.rotation.set(0, plant.group.rotation.y + plant.revolutionSpeed, 0);
  // });
  const time = performance.now();

  if (controls.isLocked === true) {
    // raycaster.ray.origin.copy(controls.getObject().position);
    // raycaster.ray.origin.y -= 10;
    //
    // const intersections = raycaster.intersectObjects(objects, false);

    // const onObject = intersections.length > 0;

    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed.value * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed.value * delta;

    // if (onObject === true) {
    //   velocity.y = Math.max(0, velocity.y);
    //   canJump = true;
    // }
    console.log('moveRight', -velocity.x * delta);
    console.log('moveForward', -velocity.z * delta);
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
  renderer.render(scene, camera);
  stats.update();
}

function init() {
  const container = document.querySelector('#solar-system') as HTMLElement;
  container.appendChild(renderer.domElement);
  document.body.appendChild(stats.dom);
  // 控制器
  // scene.traverse((object: Object3D) => {
  //   console.log(object);
  // });

  const blocker = document.getElementById('blocker');
  const instructions = document.getElementById('instructions');
  controls = new PointerLockControls(camera, container);
  if (blocker && instructions) {
    instructions.addEventListener('click', function () {
      controls.lock();
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
  }
  const onKeyDown = function (event: KeyboardEvent) {
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
  };

  const onKeyUp = function (event: KeyboardEvent) {
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
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  if (isWebGLAvailable()) {
    animate();
  } else {
    const warning = getWebGLErrorMessage();
    container.appendChild(warning);
  }
}

onMounted(() => {
  init();
});
</script>

<template>
  <div class="relative">
    <div id="blocker">
      <div id="instructions">
        <p style="font-size: 36px">Click to play</p>
        <p>
          Move: WASD<br />
          Jump: SPACE<br />
          Look: MOUSE
        </p>
      </div>
    </div>
    <div class="absolute right-0 top-0 color-#fff p-20px bg-gray-700/20">
      <p>调试面板</p>
      <p>摄像机参数：</p>
      <p>x:<input v-model="cameraPosition.x" type="number" step="500" /></p>
      <p>y:<input v-model="cameraPosition.y" type="number" step="500" /></p>
      <p>z:<input v-model="cameraPosition.z" type="number" step="500" /></p>
    </div>
    <div id="solar-system"></div>
  </div>
</template>

<style scoped>
input {
  width: 100px;
}
#blocker {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

#instructions {
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  text-align: center;
  font-size: 14px;
  cursor: pointer;
}
</style>
