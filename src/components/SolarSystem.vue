<script setup lang="ts">
import Dock from 'primevue/dock';
import Button from 'primevue/button';
import Slider from 'primevue/slider';
import InputSwitch from 'primevue/inputswitch';
import ColorPicker from 'primevue/colorpicker';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { MenuItem } from 'primevue/menuitem';
import {
  AmbientLight,
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

interface LoadedPlanet extends Group {
  cnName: string;
  sizeScale: number;
}
interface PlanetType {
  cnName: string;
  name: string;
  distance: number;
  rotationSpeed: number;
  revolutionSpeed: number;
  sizeScale: number;
}

interface DockItem {
  label: string;
  icon: string;
  sizeScale: number;
  position: Vector3;
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

const toast = useToast();
const mode = ref<ModeType>('third-person');
const loadingText = ref(''); // 加载文字
const moveSpeed = ref(50000); // 第一人称移动速度
const switchRotation = ref(true); // 是否开启星球自转
const autoRotate = ref(true); // 是否开启围绕星球旋转
const autoRotateSpeed = ref(0.5); // 是否开启围绕星球旋转
const showOption = ref(true); // 是否显示选项
const ambientLightValue = reactive({
  color: '#ffffff',
  intensity: 0,
}); // 环境光
const loadedPlanets = reactive<LoadedPlanet[]>([]); // 已加载的星球模型
const dockItems = ref<DockItem[]>([]);

// 1个天文单位
const AU = 149597871;
// 距离比例 Math.floor((AU * 1000) / 6371 * 2)
const distanceScale = Math.floor((AU * 1000) / 12742);
const { innerWidth, innerHeight } = window;

const stats = new Stats();
const scene = new Scene();
const camera = new PerspectiveCamera(25, innerWidth / innerHeight, 0.1, Number.MAX_SAFE_INTEGER);
const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// 直线灯光，模拟太阳光
const directionalLight = new DirectionalLight(0xffffff, 0.5);
const ambientLight = new AmbientLight(ambientLightValue.color, ambientLightValue.intensity);
directionalLight.position.set(-1, 0, 0);
scene.add(directionalLight);
scene.add(ambientLight);

const loader = new GLTFLoader();
const plants: PlanetTypes = [
  {
    cnName: '太阳',
    name: 'sun',
    distance: 0,
    rotationSpeed: 0,
    revolutionSpeed: 0.004,
    sizeScale: 109.5,
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
  {
    cnName: '木星',
    name: 'jupiter',
    distance: distanceScale * 5.2,
    rotationSpeed: 0.033,
    revolutionSpeed: 0.02,
    sizeScale: 10.97,
  },
  {
    cnName: '土星',
    name: 'saturn',
    distance: distanceScale * 9.5,
    rotationSpeed: 0.35,
    revolutionSpeed: 0.025,
    sizeScale: 9.14,
  },
  {
    cnName: '天王星',
    name: 'uranus',
    distance: distanceScale * 19.2,
    rotationSpeed: 0.002,
    revolutionSpeed: 0.03,
    sizeScale: 3.95,
  },
  {
    cnName: '海王星',
    name: 'neptune',
    distance: distanceScale * 30.1,
    rotationSpeed: 0.005,
    revolutionSpeed: 0.033,
    sizeScale: 3.87,
  },
];
// 更新相机位置
function updateCamera(position: Vector3) {
  camera.position.copy(position);
  camera.updateProjectionMatrix();
  if (controls instanceof OrbitControls) {
    controls.update();
  }
}
function updateControlsTarget(position: Vector3, sizeScale: number) {
  const { x, y, z } = position;
  if (controls instanceof OrbitControls) {
    controls.target.set(x, y, z);
  }
  let offsetX = 5000;
  let offsetY = 500;
  if (sizeScale) {
    offsetX *= sizeScale;
    offsetY *= sizeScale;
  }
  const vector3 = new Vector3(x + offsetX, y + offsetY, z);
  updateCamera(vector3);
}
// 加载模型
function loadPlanet(planet: PlanetType) {
  return new Promise<GLTF>((resolve, reject) => {
    loader.load(
      `models/${planet.name}.glb`,
      (GLTF: GLTF) => {
        resolve(GLTF);
      },
      (xhr) => {
        const percent = (xhr.loaded / xhr.total) * 100;
        if (percent <= 100) {
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
        loadedPlanets.push(Object.assign(plantGroup, { cnName: planet.cnName, sizeScale: planet.sizeScale }));
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

// 设置背景
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
function screenshot() {
  //  在截图之前先渲染一下场景和相机，就不会实时刷新屏幕，导致截屏下来的是空白了
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = 'solar-system.png';
  a.click();
}

// 各种事件监听
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
function onDockItemClick(item: MenuItem) {
  updateControlsTarget(item.position, item.sizeScale);
}
function onModeChange() {
  mode.value = mode.value === 'third-person' ? 'first-person' : 'third-person';
  localStorage.setItem('mode', mode.value);
  window.location.reload();
}
document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.ctrlKey && event.code === 'KeyA') {
    screenshot();
  }
});
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// 初始化
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
  if (controls instanceof OrbitControls) {
    controls.autoRotate = autoRotate.value;
    controls.autoRotateSpeed = autoRotateSpeed.value;
  }

  if (switchRotation.value) {
    const planetNames = plants.map((planet) => planet.name);
    scene.traverse((object: Object3D) => {
      if (object.name && planetNames.includes(object.name)) {
        const plantGroup = object as Group;
        const planet = plants.find((planet) => planet.name === plantGroup.name);
        if (planet) {
          // eslint-disable-next-line no-param-reassign
          plantGroup.rotation.y += planet.revolutionSpeed * 0.3;
        }
      }
    });
  }
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
  // 初始化控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(document.body);
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.5;
  // 初始化相机位置
  updateCamera(new Vector3(220000, 0, 200000));
  // 添加环境光
  const ambientLight = new AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
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
function init() {
  const solarSystemContainer = document.getElementById('solar-system') as HTMLElement;
  solarSystemContainer.appendChild(renderer.domElement);
  setStartBackground(scene);
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
  window.addEventListener('resize', onWindowResize);
}

onMounted(() => {
  if (isMobileDevice()) {
    // 手机只支持第三人称模式
    toast.add({ severity: 'info', summary: '温馨提示', detail: '建议使用 PC 体验最佳效果', life: 5000 });
    mode.value = 'third-person';
  }
  init();
});

watch(ambientLightValue, (value) => {
  const { color, intensity }: { color: string; intensity: number } = value;
  const lightColor = color.startsWith('#') ? color : `#${color}`;
  ambientLight.copy(new AmbientLight(lightColor, intensity));
});
watch(loadedPlanets, (value) => {
  // 按距离由近到远排序
  value.sort((a, b) => {
    return a.position.x - b.position.x;
  });
  if (value.length > 4) {
    dockItems.value = value.map((planet) => {
      const { cnName, name, position, sizeScale } = planet;
      return {
        label: cnName,
        icon: `/images/${name}.png`,
        position,
        sizeScale,
      };
    });
  }
  const lastPlanet = value[value.length - 1];
  if (lastPlanet) {
    updateControlsTarget(lastPlanet.position, lastPlanet.sizeScale);
  }
});
</script>

<template>
  <div class="relative bg-gray/300">
    <Toast position="top-center" />
    <p v-if="loadingText" class="color-#fff absolute top-0 left-50% translate-x--1/2 z-2">
      {{ loadingText }}
    </p>
    <div v-if="mode === 'first-person'" id="blocker" class="absolute w-full h-full bg-black/50">
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
    <div class="absolute top-10px right-10px color-#fff">
      <i
        :class="[
          showOption ? 'right-192px' : 'right-10px',
          'pi',
          'pi-bars',
          'absolute',
          'top-10px',
          'z-3',
          'ease-in',
          'duration-300',
          'cursor-pointer',
          'glass',
        ]"
        @click="showOption = !showOption"
      ></i>
      <div :class="['glass', 'ease-in', 'duration-300', showOption ? 'fold-container' : 'unfold-container']">
        <div class="my-15px flex justify-center items-center">
          <span>星球自转： </span>
          <InputSwitch v-model="switchRotation" />
        </div>
        <div class="my-15px flex justify-center items-center">
          <span>围绕星球旋转： </span>
          <InputSwitch v-model="autoRotate" />
        </div>
        <div v-if="autoRotate" class="my-15px">
          <p class="my-15px">旋转速度：</p>
          <Slider v-model="autoRotateSpeed" class="mb-20px" :min="0" :max="3" :step="0.1" />
        </div>
        <div class="my-15px flex justify-center items-center">
          <span>环境光颜色：</span>
          <ColorPicker v-model="ambientLightValue.color" :color="ambientLightValue.color"></ColorPicker>
        </div>
        <p class="my-15px">环境光强度：</p>
        <Slider v-model="ambientLightValue.intensity" class="mb-20px" :min="0" :max="1" :step="0.01" />
        <!--        <div class="my-15px flex justify-center items-center">-->
        <!--          <Button class="p-button-sm" @click="onModeChange">-->
        <!--            {{ mode === 'first-person' ? '上帝模式' : '第一人称模式' }}-->
        <!--          </Button>-->
        <!--        </div>-->
        <div class="my-15px flex justify-center items-center">
          <Button class="p-button-sm p-button-raised" @click="screenshot">
            生成壁纸<template v-if="!isMobileDevice()">(ctrl + A)</template>
          </Button>
        </div>
      </div>
    </div>
    <Dock v-if="dockItems.length" :model="dockItems" position="bottom">
      <template #icon="{ item }">
        <a v-tooltip.top="item.label" href="#" class="p-dock-action" @click="onDockItemClick(item)">
          <img class="cursor-pointer w-full" :src="item.icon" />
        </a>
      </template>
    </Dock>
    <div id="solar-system"></div>
  </div>
</template>

<style scoped>
.fold-container {
  transform: scale(1);
}
.unfold-container {
  transform: scale(0);
}
.glass {
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  background-color: rgba(17, 25, 40, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 15px 20px;
  transform-origin: top right;
}
</style>
