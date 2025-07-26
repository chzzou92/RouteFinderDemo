import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Creates a Three.js custom layer for a Mapbox map.
 * 
 * @param {Object} map - Mapbox map object.
 * @param {Object} modelTransform - Object with translation, rotation, and scale.
 * @param {string} gltfPath - Path to the .gltf or .glb model to load.
 * @returns {Object} - Custom Mapbox 3D layer.
 */
export default function createPassengerThreeLayer(map, modelTransform, gltfPath) {
  console.log("createPassengerThreeLayer called:", modelTransform, gltfPath);
  
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
      console.error("Error loading GLTF model:", error);
    }
  );

  const renderer = new THREE.WebGLRenderer({
    canvas: map.getCanvas(),
    context: map.painter.context.gl,
    antialias: true,
  });
  const name = gltfPath.match(/\/People\/[^/]+\/([^/.]+)\.gltf$/)[1];
  console.log(name)
;  renderer.autoClear = false;

  return {
    id: `3d-passengers-model-${name}`,
    type: "custom",
    renderingMode: "3d",
    render: (gl, matrix) => {
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY
      );
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ
      );

      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale
          )
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

      camera.projectionMatrix = m.multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
      map.triggerRepaint();
    },
  };
}
