import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 *
 * @param {Object} map - Mapbox map object.
 * @param {Object} modelTransform - Object with translation, rotation, and scale.
 * @param {string} gltfPath - Path to the .gltf or .glb model to load.
 * @returns {Object} - Custom Mapbox 3D layer.
 */
export default function createPassengerThreeLayer(
  map,
  modelTransform,
  gltfPath,
  zoomState
) {
  //console.log("createPassengerThreeLayer called:", modelTransform, gltfPath);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const directionalLight1 = new THREE.DirectionalLight(0xffffff);
  directionalLight1.position.set(0, -70, 100).normalize();
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff);
  directionalLight2.position.set(0, 70, 100).normalize();
  scene.add(directionalLight2);

  const loader = new GLTFLoader();
  loader.load(
    gltfPath,
    (gltf) => {
      scene.add(gltf.scene);
    },
    undefined,
    (error) => {
      console.error("Error loading GLTF model: ", error);
    }
  );

  const renderer = new THREE.WebGLRenderer({
    canvas: map.getCanvas(),
    context: map.painter.context.gl,
    antialias: true,
  });
  const name = gltfPath.match(/\/People\/[^/]+\/([^/.]+)\.gltf$/)[1];
  renderer.autoClear = false;
  return {
    id: `3d-passengers-model-${name}`,
    type: "custom",
    renderingMode: "3d",
    render: (gl, matrix) => {
      const dynamicScale =
        modelTransform.scaleBase * Math.pow(1.8, 15 - zoomState.zoom);

      // Rotations (order: Rz * Ry * Rx or adjust to taste)
      const rotX = new THREE.Matrix4().makeRotationX(modelTransform.rotateX);
      const rotY = new THREE.Matrix4().makeRotationY(modelTransform.rotateY);
      const rotZ = new THREE.Matrix4().makeRotationZ(modelTransform.rotateZ);
      const rotMat = new THREE.Matrix4()
        .multiply(rotZ)
        .multiply(rotY)
        .multiply(rotX);

      // Scale matrix (negative Y if you still need that flip)
      const scaleMat = new THREE.Matrix4().makeScale(
        dynamicScale,
        -dynamicScale,
        dynamicScale
      );
      // Translation matrix (in mercator units, as you already compute)
      const transMat = new THREE.Matrix4().makeTranslation(
        modelTransform.translateX,
        modelTransform.translateY,
        modelTransform.translateZ
      );

      // Model matrix = T * R * S
      const modelMat = new THREE.Matrix4()
        .multiply(transMat)
        .multiply(scaleMat)
        .multiply(rotMat);

      const m = new THREE.Matrix4().fromArray(matrix);
      camera.projectionMatrix = m.clone().multiply(modelMat);

      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}
