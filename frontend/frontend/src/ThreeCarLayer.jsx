import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import mapboxgl from "mapbox-gl";

export default function createThreeCarLayer(map, modelTransformsList) {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const cars = []; // Array of { model, transform, path, progress, etc. }

  const speed = 0.000003;

  const ambient = new THREE.AmbientLight(0xffffff, 1.3);
  scene.add(ambient);

  const loader = new GLTFLoader();

  modelTransformsList.forEach((transform, index) => {
    const carPath = index % 2 === 0 ? "/Car2/car2.gltf" : "/Car1/car1.gltf";

    loader.load(carPath, (gltf) => {
   //   console.log(transform);
      const carModel = gltf.scene;
      carModel.matrixAutoUpdate = false;
      scene.add(carModel);
      cars.push({
        model: carModel,
        transform: transform,
        path: [],
        distanceAlongPath: 0,
        totalDistance: 0,
        cumulativeDistances: [],
        currentAngle: 0,
      });
    });
  });

  function assignPathToCar(index, lngLatPath) {
    if (!cars[index] || lngLatPath.length < 2) return;

    const car = cars[index];
    car.path = lngLatPath.map(([lng, lat]) => {
      const c = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], 2);
      return new THREE.Vector3(c.x, c.y, c.z);
    });
    //console.log("car path: ", car.path);
    car.totalDistance = 0;
    car.cumulativeDistances = [0];
    for (let i = 1; i < car.path.length; i++) {
      const dist = car.path[i].distanceTo(car.path[i - 1]);
      car.totalDistance += dist;
      car.cumulativeDistances.push(car.totalDistance);
    }

    car.distanceAlongPath = 0;
  }

  function updateCar(car) {
    if (!car.path || car.path.length < 2) return;

    car.distanceAlongPath += speed;
    if (car.distanceAlongPath >= car.totalDistance) return;

    let i = 0;
    while (
      i < car.cumulativeDistances.length - 1 &&
      car.cumulativeDistances[i + 1] < car.distanceAlongPath
    ) {
      i++;
    }

    const start = car.path[i];
    const end = car.path[i + 1];
    const segmentStart = car.cumulativeDistances[i];
    const segmentEnd = car.cumulativeDistances[i + 1];
    const segmentLength = segmentEnd - segmentStart;

    const localT = (car.distanceAlongPath - segmentStart) / segmentLength;

    // Lerp position
    car.transform.translateX = (1 - localT) * start.x + localT * end.x;
    car.transform.translateY = (1 - localT) * start.y + localT * end.y;
    car.transform.translateZ = (1 - localT) * start.z + localT * end.z;

    // Rotation
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const targetAngle = Math.atan2(dx, dy);

    let deltaAngle = targetAngle - car.currentAngle;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

    const rotationSpeed = 0.1;
    car.currentAngle += deltaAngle * rotationSpeed;
    car.transform.rotateY = car.currentAngle;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas: map.getCanvas(),
    context: map.painter.context.gl,
    antialias: true,
  });
  renderer.autoClear = false;

  const layer = {
    id: "3d-car-model",
    type: "custom",
    renderingMode: "3d",
    render: (gl, matrix) => {
      const m = new THREE.Matrix4().fromArray(matrix);
      camera.projectionMatrix = m;

      renderer.resetState();
      cars.forEach((car, index) => {
        updateCar(car);
        const { transform, model } = car;
        // console.log(transform, "car" + index);
        const rotX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          transform.rotateX
        );
        const rotY = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 1, 0),
          transform.rotateY
        );
        const rotZ = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 0, 1),
          transform.rotateZ
        );
        const translation = new THREE.Matrix4().makeTranslation(
          transform.translateX,
          transform.translateY,
          transform.translateZ
        );
        const scale = new THREE.Matrix4().makeScale(
          transform.scale,
          -transform.scale,
          transform.scale
        );

        const modelMatrix = new THREE.Matrix4()
          .multiply(translation)
          .multiply(scale)
          .multiply(rotX)
          .multiply(rotY)
          .multiply(rotZ);

        model.matrix = modelMatrix;
        model.updateMatrixWorld(true);
        //  console.log(model.position, model.matrix, model.visible);
        //   console.log(scene.children);
      });
      renderer.render(scene, camera);
      map.triggerRepaint();
    },
  };

  return {
    layer,
    assignPathToCar,
  };
}
