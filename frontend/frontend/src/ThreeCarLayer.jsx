import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import mapboxgl from "mapbox-gl";

export default function createThreeCarLayer(map, modelTransform) {
  console.log("createThreeCarLayer called:", modelTransform);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  let car = null;
  let mercatorPath = [];
  let progress = 0;
  let pendingPath = null;

  const directionalLight1 = new THREE.DirectionalLight(0xffffff);
  directionalLight1.position.set(0, -70, 100).normalize();
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff);
  directionalLight2.position.set(0, 70, 100).normalize();
  scene.add(directionalLight2);

  const loader = new GLTFLoader();
  loader.load("/Car1/car1.gltf", (gltf) => {
    car = gltf.scene;
    scene.add(car);
    if (pendingPath) {
      animateCar(pendingPath);
      pendingPath = null;
    }
  });

  let totalDistance = 0;
  let cumulativeDistances = [];

  function animateCar(path) {
    if (!car) {
      pendingPath = path;
      return;
    }
    if (path.length < 2) return;

    const scaledPath = path.map(([lng, lat]) => {
      const coord = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], 2);
      return new THREE.Vector3(coord.x, coord.y, coord.z);
    });

    // Compute distances
    totalDistance = 0;
    cumulativeDistances = [0];
    for (let i = 1; i < scaledPath.length; i++) {
      const dist = scaledPath[i].distanceTo(scaledPath[i - 1]);
      totalDistance += dist;
      cumulativeDistances.push(totalDistance);
    }

    mercatorPath = scaledPath;
    progress = 0;

    startAnimationLoop();
  }

  function updateCarPosition() {
    if (!car || mercatorPath.length < 2 || progress >= 1) return;

    const distanceTraveled = progress * totalDistance;

    // Find segment that contains this distance
    // let i = 0;
    // while (
    //   i < cumulativeDistances.length - 1 &&
    //   cumulativeDistances[i + 1] < distanceTraveled
    // ) {
    //   i++;
    // }

    // const start = mercatorPath[i];
    // const end = mercatorPath[i + 1];
    // const segStartDist = cumulativeDistances[i];
    // const segEndDist = cumulativeDistances[i + 1];
    // const segAlpha =
    //   (distanceTraveled - segStartDist) / (segEndDist - segStartDist);
    // console.log("Position before: ", car.position);
    // car.position.lerpVectors(start, end, segAlpha);
    // console.log("Position after: ", car.position);

    modelTransform.translateX = mercatorPath[progress].x;
    modelTransform.translateY = mercatorPath[progress].x;
    modelTransform.translateZ = mercatorPath[progress].z;

    // Rotation
    // const direction = new THREE.Vector3().subVectors(end, start).normalize();
    // if (direction.length() > 0) {
    //   car.lookAt(
    //     car.position.x + direction.x,
    //     car.position.y + direction.y,
    //     car.position.z + direction.z
    //   );
    // }

    // Adjust speed here
    progress += 1;
  }
  const renderer = new THREE.WebGLRenderer({
    canvas: map.getCanvas(),
    context: map.painter.context.gl,
    antialias: true,
  });
  renderer.autoClear = false;

  function startAnimationLoop() {
    function loop() {
        

      requestAnimationFrame(loop);
    }
    loop();
  }

  const layer = {
    id: "3d-car-model",
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
  return { layer, animateCar };
}
