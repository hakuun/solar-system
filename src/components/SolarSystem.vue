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
} from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import WEBGL from 'three/examples/jsm/capabilities/WebGL';
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

const cameraPosition = ref<Vector3>(new Vector3(0, 0, 12000));
const currentPlant = ref('sun');
const form = reactive<anyObject>({});
const plants: Planets = [
  {
    name: 'sun',
    modelSrc: 'src/assets/models/sun.glb',
    distance: 0,
    rotationSpeed: 0,
    revolutionSpeed: 0.004,
    parentGroup: new Group(),
    sizeScale: 10,
  },
  {
    name: 'mercury',
    modelSrc: 'src/assets/models/mercury.glb',
    distance: 1000 * 6,
    rotationSpeed: 0.015,
    revolutionSpeed: 0.002,
    parentGroup: new Group(),
    sizeScale: 0.5,
  },
  {
    name: 'venus',
    modelSrc: 'src/assets/models/venus.glb',
    distance: 1000 * 8,
    rotationSpeed: 0.0065,
    revolutionSpeed: 0.005,
    parentGroup: new Group(),
    sizeScale: 0.7,
  },
  {
    name: 'earth',
    modelSrc: 'src/assets/models/earth.glb',
    distance: 1000 * 10,
    rotationSpeed: 0.05,
    revolutionSpeed: 0.01,
    parentGroup: new Group(),
    sizeScale: 1,
  },
  // {
  //   name: 'mars',
  //   modelSrc: 'src/assets/models/mars.glb',
  //   position: new Vector3(1000 * 4.4, 0, 0),
  //   rotationSpeed: 0.03,
  //   revolutionSpeed: 0.01,
  //   parentGroup: new Group(),
  //   sizeScale: 0.8,
  // },
  // {
  //   name: 'jupiter',
  //   modelSrc: 'src/assets/models/jupiter.glb',
  //   position: new Vector3(1000 * 500, 0, 0),
  //   rotationSpeed: 0.01,
  //   revolutionSpeed: 0.08,
  //   parentGroup: new Group(),
  //   sizeScale: 50,
  // },
  // {
  //   name: 'saturn',
  //   modelSrc: 'src/assets/models/saturn.glb',
  //   position: new Vector3(1000 * 8.8, 0, 0),
  //   rotationSpeed: 0.02,
  //   revolutionSpeed: 1.5,
  //   parentGroup: new Group(),
  //   sizeScale: 50,
  // },
  // {
  //   name: 'uranus',
  //   modelSrc: 'src/assets/models/uranus.glb',
  //   position: new Vector3(1000 * 11.1, 0, 0),
  //   rotationSpeed: 0.09,
  //   revolutionSpeed: 1,
  //   parentGroup: new Group(),
  //   sizeScale: 30,
  // },
  // {
  //   name: 'neptune',
  //   modelSrc: 'src/assets/models/neptune.glb',
  //   position: new Vector3(1000 * 12.3, 0, 0),
  //   rotationSpeed: 0.01,
  //   revolutionSpeed: 0.1,
  //   parentGroup: new Group(),
  //   sizeScale: 30,
  // },
];

const { innerWidth: width, innerHeight: height } = window;
const scene = new Scene();
const loader = new GLTFLoader();
const camera = new PerspectiveCamera(90, width / height, 0.1, Number.MAX_SAFE_INTEGER);

// 渲染器
const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
// 灯光
const ambientLight = new AmbientLight('0xffffff', 1);
const directionalLight = new DirectionalLight(0xffffff, 1);
scene.add(ambientLight);
scene.add(directionalLight);
effect(() => {
  camera.position.set(cameraPosition.value.x, cameraPosition.value.y, cameraPosition.value.z);
  const plant = plants.find((item) => item.name === currentPlant.value);
  if (plant) {
    const { distance, sizeScale, revolutionSpeed, rotationSpeed, parentGroup } = plant;
    form.distance = distance;
    form.sizeScale = sizeScale;
    form.revolutionSpeed = revolutionSpeed;
    form.rotationSpeed = rotationSpeed;
    form.parentGroup = parentGroup;
  }
});

// 控制器
const controls = new OrbitControls(camera, renderer.domElement);

function setStartBackground() {
  // 生成繁星背景
  const r = 6371;
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

  for (let i = 30; i < 10; i += 1) {
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
setStartBackground();
function loadModel(plant: Planet) {
  return new Promise<Planet>((resolve, reject) => {
    loader.load(plant.modelSrc, (gltf: GLTF) => {
      const model = gltf.scene;
      // eslint-disable-next-line no-param-reassign
      plant.group = model;
      if (plant.sizeScale) {
        model.scale.setScalar(plant.sizeScale);
      }
      model.position.set(plant.distance, 0, 0);
      plant.parentGroup.add(model);
      resolve(plant);
    });
  });
}

// 加载模型
plants.forEach(async (plant) => {
  const loadedPlant = await loadModel(plant);
  scene.add(loadedPlant.parentGroup);
});

function animate() {
  requestAnimationFrame(animate);
  plants.forEach((plant) => {
    plant.parentGroup.rotation.set(0, plant.parentGroup.rotation.y + plant.rotationSpeed * 0.1, 0);
    plant?.group?.rotation.set(0, plant.group.rotation.y + plant.revolutionSpeed * 0.1, 0);
  });
  renderer.render(scene, camera);
}

function init() {
  const container = document.querySelector('#solar-system') as HTMLElement;
  container?.appendChild(renderer.domElement);
  container.addEventListener('resize', () => {
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  if (isWebGLAvailable()) {
    animate();
  } else {
    const warning = getWebGLErrorMessage();
    container?.appendChild(warning);
  }
}
// watch(form, async () => {
//   const plant = plants.find((item) => item.name === currentPlant.value);
//   if (plant) {
//     scene.remove(plant.parentGroup);
//     const loadedPlant = await loadModel({ ...plant, ...form });
//     scene.add(loadedPlant.parentGroup);
//   }
// });
onMounted(() => {
  init();
});
</script>

<template>
  <div class="relative">
    <div class="absolute right-0 top-0 color-#fff p-20px bg-gray-700/20">
      <p>调试面板</p>
      <p>选择行星：</p>
      <select v-model="currentPlant">
        <option v-for="plant in plants" :key="plant.name" :label="plant.name">
          {{ plant.name }}
        </option>
      </select>

      <p>参数：</p>
      <p>大小：<input v-model="form.sizeScale" type="number" /></p>
      <p>公转速度：<input v-model="form.revolutionSpeed" type="number" /></p>
      <p>自转速度：<input v-model="form.rotationSpeed" type="number" /></p>
      <p>距离：<input v-model="form.distance" type="number" /></p>
      <p>摄像机参数：</p>
      <p>x:<input v-model="cameraPosition.x" type="number" /></p>
      <p>y:<input v-model="cameraPosition.y" type="number" /></p>
      <p>z:<input v-model="cameraPosition.z" type="number" step="500" /></p>
    </div>
    <div id="solar-system"></div>
  </div>
</template>

<style scoped>
input {
  width: 100px;
}
</style>
