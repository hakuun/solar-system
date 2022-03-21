<script setup lang="ts">
import {
  BufferGeometry,
  Clock,
  DirectionalLight,
  Float32BufferAttribute,
  FogExp2,
  Group,
  MeshPhongMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Stats from 'stats.js';

import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';

const radius = 6371;
const tilt = 0.41;
const rotationSpeed = 0.02;

const moonScale = 0.9;

const MARGIN = 0;
let SCREEN_HEIGHT = window.innerHeight - MARGIN * 2;
let SCREEN_WIDTH = window.innerWidth;

let camera: PerspectiveCamera;
let controls: FlyControls;
let scene: Scene;
let renderer: WebGLRenderer;
let stats: Stats;
let geometry;
let meshPlanet: Group;
let meshMoon: Group;

let dirLight;

let composer: EffectComposer;

const textureLoader = new TextureLoader();

let d;
let dPlanet;
let dMoon;
const dMoonVec = new Vector3();

const clock = new Clock();

function init() {
  camera = new PerspectiveCamera(25, SCREEN_WIDTH / SCREEN_HEIGHT, 50, 1e7);
  camera.position.z = radius * 5;

  scene = new Scene();
  scene.fog = new FogExp2(0x000000, 0.00000025);

  dirLight = new DirectionalLight(0xffffff);
  dirLight.position.set(-1, 0, 1).normalize();
  scene.add(dirLight);

  // planet
  const loader = new GLTFLoader();
  loader.load('models/earth.glb', (gltf: GLTF) => {
    meshPlanet = gltf.scene;
    meshPlanet.rotation.y = 0;
    meshPlanet.rotation.z = tilt;
    scene.add(meshPlanet);
  });

  loader.load('models/sun.glb', (gltf: GLTF) => {
    meshMoon = gltf.scene;
    meshMoon.position.set(radius * 5, 0, 0);
    meshMoon.scale.set(moonScale, moonScale, moonScale);
    scene.add(meshMoon);
  });
  // stars

  const r = radius;
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

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  document.body.appendChild(renderer.domElement);

  //

  controls = new FlyControls(camera, renderer.domElement);

  controls.movementSpeed = 1000;
  controls.domElement = renderer.domElement;
  controls.rollSpeed = Math.PI / 24;
  controls.autoForward = false;
  controls.dragToLook = false;

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // postprocessing

  const renderModel = new RenderPass(scene, camera);
  const effectFilm = new FilmPass(0.35, 0.75, 2048);

  composer = new EffectComposer(renderer);

  composer.addPass(renderModel);
  composer.addPass(effectFilm);
}

function onWindowResize() {
  SCREEN_HEIGHT = window.innerHeight;
  SCREEN_WIDTH = window.innerWidth;

  camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
  camera.updateProjectionMatrix();

  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  composer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
}
window.addEventListener('resize', onWindowResize);

function render() {
  // rotate the planet and clouds

  const delta = clock.getDelta();
  meshPlanet.rotation.y += rotationSpeed * delta;
  // meshClouds.rotation.y += 1.25 * rotationSpeed * delta;

  // slow down as we approach the surface

  dPlanet = camera.position.length();

  dMoonVec.subVectors(camera.position, meshMoon.position);
  dMoon = dMoonVec.length();

  if (dMoon < dPlanet) {
    d = dMoon - radius * moonScale * 1.01;
  } else {
    d = dPlanet - radius * 1.01;
  }

  controls.movementSpeed = 0.33 * d;
  controls.update(delta);

  // composer.render(delta);
}
function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}
onMounted(() => {
  init();
  animate();
});
</script>

<template>
  <div id="planet"></div>
</template>

<style scoped></style>
