import * as CANNON from './dependencies/cannon-es';
import * as THREE from './dependencies/three';
import * as BufferGeometryUtils from './dependencies/BufferGeometryUtils.js';
//import * as OrbitControls from 'three/examples/jsm/controls/OrbitControls.js';
//import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

var DEBUG = 0;

var canvas = document.querySelector('#canvas');
var scoreResult = document.querySelector('#score-result');
var rollBtn = document.querySelector('#roll-btn');

var walls = [], rayLine;

var canvasWidth = canvas.offsetWidth;
var canvasHeight = canvas.offsetHeight;

var numberOfDice = 5;
var size = 4.5; // default:5
var camera = 1; // default:1
var showHelpers = DEBUG && 1;

var cameraFieldOfView = 40 + (size * 5);
var cameraPosition = [0, size, camera];
var floorShadowY = -1;
var wallHeight = cameraFieldOfView / 10 - .5;
var wallOffset = cameraFieldOfView / 10 - .5;

var diceColor = "white";
var dotColor = "black";
var diceDotOffset = .485; // how far the inner BLACK dots are from the center of the dice

var dropHeight = 6;
var dropOffset = -1; // distance from floor center where a dice dropped
var dropXoffset = 1; // distance to the right a dice starts falling
var dropPositions = [
    [0, dropHeight, 0],
    [-dropOffset, dropHeight, -dropOffset],
    [dropOffset, dropHeight, -dropOffset],
    [-dropOffset, dropHeight, dropOffset],
    [dropOffset, dropHeight, dropOffset],
];

var body_mass = 2;
var gravity = [0, -50, 0];
var diceThrowImpulse = 4 + 5 * Math.random();
var diceThrowRotation = 0.7;
var worldBounceRestitution = 0.7; // default: 0.6 how hard the floor bounces materials, higher is more bounce, above .6 dice can forever vibrate
var nudgeMagnitude = 10; // Adjust this value to change the strength of the impulse

if (DEBUG) gravity[1] = -550; worldBounceRestitution = 0.06; // DEBUG values

var diceSegments = 40; // 40-60
var diceEdgeRadius = .13; // .13-.2 rounded corners of the dice
var diceParams = {
    notchRadius: .13,
    notchDepth: .13,
};
var diceArray = [];
var alignedDiceHeight = 4;

var THREE_Vector2 = (x = 0, y = 0) => new THREE.Vector2(x, y);
var THREE_Vector3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
var CANNON_Vector3 = (x = 0, y = 0, z = 0) => new CANNON.Vec3(x, y, z);
var CANNON_World = (b) => new CANNON.World(b);
var CANNON_Body = (b) => new CANNON.Body(b);
var CANNON_Box = (b) => new CANNON.Box(b);

var render_scene = () => renderer.render(scene, camera);

var radians = angle => angle * (Math.PI / 180);

class DIE {
    constructor() {
        var D = this;
        var M = D.mesh = diceMesh.clone();
        var P = M.position;
        var R = M.rotation;
        var body = CANNON_Body({
            mass: body_mass,
            shape: CANNON_Box(CANNON_Vector3(.5, .5, .5)),
            sleepTimeLimit: .1,
        });
        scene.add(M);
        world.addBody(body);
        //body.addEventListener('sleep', (e) => sleepDice(body));
        return {
            die: D,
            mesh: M,
            body,
            moveTo: ({
                x = P.x,
                y = P.y,
                z = P.z,
                speed = 1,
                vector = THREE_Vector3(x, y, z) }
            ) => {
                var A = () => {
                    var toTarget = vector.clone().sub(P); // Calculate the vector from the dice to the target
                    if (toTarget.length() >= 1) { // If the dice is not close enough to the target, move it
                        toTarget.normalize().multiplyScalar(speed);
                        P.add(toTarget);
                        requestAnimationFrame(A);
                    } else { // If the dice is close enough to the target, stop moving it
                        P.copy(vector);
                    }
                    render_scene()
                }
                A();
            },
            rotateTo2: ({
                x = R.x,
                y = R.y,
                z = R.z,
                speed = .05
            }) => {
                let dice = D;
                // Assuming dice is your THREE.Mesh object

                // Target rotation in Euler angles (radians)
                var targetRotation = new THREE.Euler(toRadians(30), toRadians(45), toRadians(60)); // Replace these numbers with your desired rotation in degrees

                // Convert the Euler angle to a quaternion
                var targetQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);

                // Rotation speed (between 0 and 1)
                var rotationSpeed = 0.01;

                // Function to convert degrees to radians
                function toRadians(angle) {
                    return angle * (Math.PI / 180);
                }

                // The animate function
                function animate() {
                    // Create a new quaternion for the interpolated rotation
                    var newQuaternion = new THREE.Quaternion();

                    // Slerp from the dice's current rotation to the target rotation
                    THREE.Quaternion.slerpQuaternions(dice.quaternion, targetQuaternion, newQuaternion, rotationSpeed);

                    // Assign the new quaternion to the dice
                    dice.quaternion.copy(newQuaternion);

                    // Render the scene
                    renderer.render(scene, camera);  // Replace renderer, scene, and camera with your own

                    // If the dice hasn't reached the target rotation, call animate again on the next frame
                    if (!dice.quaternion.equals(targetQuaternion)) {
                        requestAnimationFrame(animate);
                    }
                }

                // Start the animation
                animate();
            },
            rotateTo: ({
                x = R.x,
                y = R.y,
                z = R.z,
                speed = .05
            }) => {
                console.log(x, y, z);
                var euler = new THREE.Euler().setFromQuaternion(M.quaternion);
                euler.x = radians(x);
                euler.y = radians(y);
                euler.z = radians(z);
                //var euler = new THREE.Euler(ce.x * Math.PI / 180, ce.y * Math.PI / 180, z * Math.PI / 180);
                var A = () => {
                    var { x, y, z } = new THREE.Euler().setFromQuaternion(M.quaternion);
                    var target = new THREE.Euler(
                        euler.x - x,
                        euler.y - y,
                        euler.z - z,
                        'XYZ'
                    );
                    var animate = v => v >= speed && console.warn(v, speed);
                    var animating = animate(target.x) || animate(target.y) || animate(target.z);
                    if (animating) {
                        R.x += (target.x = Math.sign(target.x) * speed);
                        R.y += (target.y = Math.sign(target.y) * speed);
                        R.z += target.z = Math.sign(target.z) * speed;
                        requestAnimationFrame(A);
                    } else {
                        R.copy(euler);
                    }
                    render_scene()
                }
                A();
            },
            nudge: () => {
                console.warn("nudge", D.id);
                body.applyImpulse(CANNON_Vector3(
                    (Math.random() - 0.5) * nudgeMagnitude,
                    (Math.random() - 0.5) * nudgeMagnitude,
                    (Math.random() - 0.5) * nudgeMagnitude
                ), P)
            },

        };
    }
    get material() {
        return this.mesh.children[1].material;
    }
    get color() {
        return this.material.color;
    }
    set color(color = "white") {
        this.material.color.set(color);
    }
}

// ============================================================================ init world
{
    var world = CANNON_World({
        allowSleep: true,
        gravity: CANNON_Vector3(...gravity),
    });
    world.defaultContactMaterial.restitution = worldBounceRestitution;
}
// ============================================================================ init scene
{
    var renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas
    });
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    var scene = new THREE.Scene();
    //scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(
        cameraFieldOfView, // field of view angle
        innerWidth / innerHeight, // aspect ratio
        .01, // near location "frustum"
        300 // far location "frustum"
    );
    camera.position.set(...cameraPosition).multiplyScalar(2);
    camera.lookAt(0, 0, 0);

    updateSceneSize();

    var ambientLight = new THREE.AmbientLight(0xffffff, .5);
    scene.add(ambientLight);
    var topLight = new THREE.PointLight(0xffffff, .5);
    topLight.position.set(0, 25, wallHeight * 2);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 2048;
    topLight.shadow.mapSize.height = 2048;
    topLight.shadow.camera.near = .1;
    topLight.shadow.camera.far = 1400;
    scene.add(topLight);

    createFloor();
    var diceMesh = createDiceMesh();
    diceArray = Array(numberOfDice).fill(0).map(i => {
        var die = new DIE();
        diceArray.push(die);
        die.body.addEventListener('sleep', (e) => sleepDie(die));
        detectWallCollisions(die);
        return die;
    })
    console.log(diceArray[0]);

    if (showHelpers) scene.add(new THREE.AxesHelper(wallHeight));

    var raycaster = new THREE.Raycaster();

    //addWalls();

    addRay();
    raylineView();
    //showFloor();
    throwDice();
    render_rolling_dice();
}
// ==================================== init event listeners
window.addEventListener('resize', updateSceneSize);
window.addEventListener('dblclick', throwDice);
rollBtn.addEventListener('click', throwDice);

function addRay() {
    // Define a BufferGeometry for the ray line
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    rayLine = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: 0xff0000 }) // Define a material for the ray line
    );
    scene.add(rayLine);// Add the ray line to the scene

    renderer.domElement.addEventListener('click', function (event) {
        // Normalize mouse position to -1 to 1
        var mouse = THREE_Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        addLine(mouse.x, mouse.y);
    });

    renderer.domElement.addEventListener('click', (event) => {
        cubeside(event);
        //animate();
    });
    if (DEBUG) {
        addLine(-3, 5, 0);
        addLine(-1.5, 5, 0);
        addLine(0, 5, 0);
        addLine(1.5, 5, 0);
        addLine(3, 5, 0);
    }
}

function cubeside(event) {
    var line;
    var { width, height } = canvas.getBoundingClientRect();
    var vector = THREE_Vector3(
        (event.clientX / width) * 2 - 1,
        -(event.clientY / height) * 2 + 1,
        0.5
    );
    vector.unproject(camera);
    raycaster.set(camera.position, vector.sub(camera.position).normalize());
    diceArray.map(dice => {
        var intersects = raycaster.intersectObject(dice.mesh);
        if (intersects.length > 0) {
            var index = Math.floor(intersects[0].faceIndex / 2);
            console.warn(dice.value, "side", index + 1);
            line && line.removeFromParent();
            line = addLine(vector.x, vector.y, vector.z);
            dice.mesh.removeFromParent();
            render_scene()
        }
    })
}

function drawLine(vector) {
    // Draw a line from pointA in the given direction at distance 100
    var pointA = vector;
    var direction = THREE_Vector3(10, 0, 0);
    direction.normalize();
    var distance = 100; // at what distance to determine pointB
    var pointB = THREE_Vector3();
    pointB.addVectors(pointA, direction.multiplyScalar(distance));
    var geometry = new THREE.Geometry();
    geometry.vertices.push(pointA);
    geometry.vertices.push(pointB);
    var material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    var line = new THREE.Line(geometry, material);
    scene.add(line);
    render_scene()
}

function raylineView() {
    var line;
    var raycast = new THREE.Raycaster();
    var intersectPoint = THREE_Vector3();
    renderer.domElement.addEventListener('mousemove', function (event) {
        // Normalize mouse position to -1 to 1 range
        var mouse = THREE_Vector2();
        var rect = event.target.getBoundingClientRect(); // Get the bounding box of the canvas
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        // Update the picking ray with the camera and mouse position
        raycast.setFromCamera(mouse, camera);
        // Calculate the intersection of the ray with a plane at y = 0 (the floor)
        var planeHeight = alignedDiceHeight;
        var intersects = raycast.ray.intersectPlane(
            new THREE.Plane(
                THREE_Vector3(0, 1, 0), // 
                planeHeight // Height (y) of the plane
            ),
            intersectPoint // point where the ray intersects the plane
        );
        // If the ray intersects the plane
        if (intersects) {
            line && line.removeFromParent();
            line = addLine(intersectPoint.x, planeHeight + 1, intersectPoint.z);
        }
    });
}

function addLine(x, y, z = 0) {
    var geometry = new THREE.BufferGeometry();// Create a BufferGeometry
    // Define coordinates
    var vertices = new Float32Array([
        x, 0, 0, // Vector1 coordinates
        x, y, z  // Vector2 coordinates
    ]);
    // Assign coordinates to the geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    // Create a LineBasicMaterial
    var material = new THREE.LineBasicMaterial({ color: "green", linewidth: 1 });
    var line = new THREE.Line(geometry, material); // Create a Line with the geometry and material
    scene.add(line);// Add the line to your scene
    render_scene()
    return line;
}

function addWalls() {
    var wallbase = 3;
    walls = [
        CANNON_Vector3(0, wallbase, wallOffset - 0.75),  // Front wall
        CANNON_Vector3(0, wallbase, -wallOffset), // Back wall
        CANNON_Vector3(wallOffset, wallbase, 0),  // Right wall
        CANNON_Vector3(-wallOffset, wallbase, 0), // Left wall
    ].map((wall, idx) => {
        var wallBody = CANNON_Body({
            mass: 0, // static body
        }); // mass = 0 makes it immovable
        wallBody.addShape(
            CANNON_Box(CANNON_Vector3(wallHeight, wallHeight, 0)) // Half extents = half the width, height, depth
        );
        wallBody.position.copy(wall);
        world.addBody(wallBody);
        var wallThinkness = .001;
        var wallMesh = new THREE.Mesh(
            new THREE.BoxGeometry(wallOffset * 2, wallHeight, wallThinkness), // Full width, height, depth to match the Cannon.js shape
            new THREE.MeshBasicMaterial({
                color: DEBUG ? [
                    0xff0000, // Red
                    0x00ff00, // Green
                    0x0000ff, // Blue
                    0xffff00  // Yellow
                ][idx] : "transparent", // wall color                
                //wireframe: DEBUG ? false : true,
                opacity: DEBUG ? 1 : 0.5,
                transparent: DEBUG ? true : false
            })
        );
        if (idx === 2 || idx === 3) { // Assuming that green and yellow walls are at index 1 and 3 respectively
            var rotationQuaternion = new CANNON.Quaternion();
            rotationQuaternion.setFromAxisAngle(CANNON_Vector3(0, 1, 0), Math.PI / 2); // Rotate 90 degrees around the Y-axis
            wallMesh.rotation.y = Math.PI / 2; // Rotate 90 degrees
            wallBody.quaternion.copy(rotationQuaternion);
        }
        wallMesh.position.copy(wall);
        wallMesh.quaternion.copy(wallBody.quaternion); // Copy the rotation from the Cannon.js body
        wallMesh.visible = showHelpers;
        scene.add(wallMesh);
        return wallBody;
    });
}

function createFloor() {
    var floorOpacity = .1;
    var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShadowMaterial({
            opacity: floorOpacity
        })
    )
    floor.receiveShadow = true;
    floor.position.y = floorShadowY;
    floor.quaternion.setFromAxisAngle(THREE_Vector3(-1, 0, 0), Math.PI * .5);
    scene.add(floor);
    var floorBody = CANNON_Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    floorBody.position.copy(floor.position);
    floorBody.quaternion.copy(floor.quaternion);
    world.addBody(floorBody);
}

function createDiceMesh() {
    var boxMaterialOuter = new THREE.MeshStandardMaterial({
        color: diceColor,
        //wireframe:true   
    })
    var boxMaterialInner = new THREE.MeshStandardMaterial({
        color: dotColor,
        roughness: 0,
        metalness: 1,
        side: THREE.DoubleSide,
    })
    var diceMesh = new THREE.Group();
    var innerMesh = new THREE.Mesh(createInnerGeometry(), boxMaterialInner);
    var outerMesh = new THREE.Mesh(createBoxGeometry(), boxMaterialOuter);
    //innerMesh.castShadow = true;
    outerMesh.castShadow = true;
    diceMesh.add(innerMesh, outerMesh);
    return diceMesh;
}

function createBoxGeometry() {
    var boxGeometry = new THREE.BoxGeometry(1, 1, 1, diceSegments, diceSegments, diceSegments);
    var positionAttr = boxGeometry.attributes.position;
    var subCubeHalfSize = .5 - diceEdgeRadius;
    for (var i = 0; i < positionAttr.count; i++) {
        var position = THREE_Vector3().fromBufferAttribute(positionAttr, i);
        var subCube = THREE_Vector3(Math.sign(position.x), Math.sign(position.y), Math.sign(position.z)).multiplyScalar(subCubeHalfSize);
        var addition = THREE_Vector3().subVectors(position, subCube);
        if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.normalize().multiplyScalar(diceEdgeRadius);
            position = subCube.add(addition);
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
            addition.z = 0;
            addition.normalize().multiplyScalar(diceEdgeRadius);
            position.x = subCube.x + addition.x;
            position.y = subCube.y + addition.y;
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.y = 0;
            addition.normalize().multiplyScalar(diceEdgeRadius);
            position.x = subCube.x + addition.x;
            position.z = subCube.z + addition.z;
        } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.x = 0;
            addition.normalize().multiplyScalar(diceEdgeRadius);
            position.y = subCube.y + addition.y;
            position.z = subCube.z + addition.z;
        }
        var notchWave = (v) => {
            v = (1 / diceParams.notchRadius) * v;
            v = Math.PI * Math.max(-1, Math.min(1, v));
            return diceParams.notchDepth * (Math.cos(v) + 1.);
        }
        var notch = (pos) => notchWave(pos[0]) * notchWave(pos[1]);
        var offset = .25;
        if (position.y === .5) {
            position.y -= notch([position.x, position.z]);
        } else if (position.x === .5) {
            position.x -= notch([position.y + offset, position.z + offset]);
            position.x -= notch([position.y - offset, position.z - offset]);
        } else if (position.z === .5) {
            position.z -= notch([position.x - offset, position.y + offset]);
            position.z -= notch([position.x, position.y]);
            position.z -= notch([position.x + offset, position.y - offset]);
        } else if (position.z === -.5) {
            position.z += notch([position.x + offset, position.y + offset]);
            position.z += notch([position.x + offset, position.y - offset]);
            position.z += notch([position.x - offset, position.y + offset]);
            position.z += notch([position.x - offset, position.y - offset]);
        } else if (position.x === -.5) {
            position.x += notch([position.y + offset, position.z + offset]);
            position.x += notch([position.y + offset, position.z - offset]);
            position.x += notch([position.y, position.z]);
            position.x += notch([position.y - offset, position.z + offset]);
            position.x += notch([position.y - offset, position.z - offset]);
        } else if (position.y === -.5) {
            position.y += notch([position.x + offset, position.z + offset]);
            position.y += notch([position.x + offset, position.z]);
            position.y += notch([position.x + offset, position.z - offset]);
            position.y += notch([position.x - offset, position.z + offset]);
            position.y += notch([position.x - offset, position.z]);
            position.y += notch([position.x - offset, position.z - offset]);
        }
        positionAttr.setXYZ(i, position.x, position.y, position.z);
    }
    boxGeometry.deleteAttribute('normal');
    boxGeometry.deleteAttribute('uv');
    boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);
    boxGeometry.computeVertexNormals();
    return boxGeometry;
}

function createInnerGeometry() {
    var baseGeometry = new THREE.PlaneGeometry(1 - 2 * diceEdgeRadius, 1 - 2 * diceEdgeRadius);
    return BufferGeometryUtils.mergeGeometries([
        baseGeometry.clone().translate(0, 0, -diceDotOffset), // side 1
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(diceDotOffset, 0, 0), // side 2
        baseGeometry.clone().translate(0, 0, diceDotOffset), // side 3
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, diceDotOffset, 0), // side 4
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(-diceDotOffset, 0, 0), // side 5
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, -diceDotOffset, 0), // side 6
    ], false);
}

function sleepDie(die) {
    var { body, mesh } = die;
    //console.log("sleep dice", body.id, dice.value);
    body.allowSleep = false;
    var euler = CANNON_Vector3();
    body.quaternion.toEuler(euler);
    var eps = .1;
    var isZero = (angle) => Math.abs(angle) < eps;
    var isHalfPi = (angle) => Math.abs(angle - .5 * Math.PI) < eps;
    var isMinusHalfPi = (angle) => Math.abs(.5 * Math.PI + angle) < eps;
    var isPiOrMinusPi = (angle) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);
    var stoppedRolling = (value) => {
        die.value = value;
        die.rolling = false;
        //console.log(dice.body.position.y); is 0.298 under floor?
        if (die.mesh.position.y > 1) {
            console.warn("stacked dice");
            die.nudge();
        } else {
            showRollResults(value);
            return;
        }
    }
    if (isZero(euler.z)) {
        if (isZero(euler.x)) {
            stoppedRolling(1);
        } else if (isHalfPi(euler.x)) {
            stoppedRolling(4);
        } else if (isMinusHalfPi(euler.x)) {
            stoppedRolling(3);
        } else if (isPiOrMinusPi(euler.x)) {
            stoppedRolling(6);
        } else {
            // landed on edge => wait to fall on side and fire the event again
            console.warn("landed on edge1", die.value);
            die.nudge();
            die.body.allowSleep = true;
        }
    } else if (isHalfPi(euler.z)) {
        stoppedRolling(2);
    } else if (isMinusHalfPi(euler.z)) {
        stoppedRolling(5);
    } else {
        console.warn("landed on edge2");
        // landed on edge => wait to fall on side and fire the event again
        body.allowSleep = true;
        die.nudge();
    }
}

function detectWallCollisions(die) {
    die.body.addEventListener("collide", (evt) => walls.forEach(wall => {
        if (evt.body === wall) {
            console.log("Dice", die.body.id, " hit wall", wall.id);
            die.hitwall = wall;
        }
    }));
}

function showRollResults(score) {
    if (scoreResult.innerHTML === '') {
        scoreResult.innerHTML += score;
    } else {
        scoreResult.innerHTML += ('+' + score);
    }
}

function render_rolling_dice() {
    world.fixedStep();
    if (diceArray.map(die => {
        die.mesh.position.copy(die.body.position);
        die.mesh.quaternion.copy(die.body.quaternion);
        return die.rolling
    }).filter(Boolean).length) {
        render_scene();
        requestAnimationFrame(render_rolling_dice);
    } else {
        console.log("done rolling", diceArray.map((dice, idx) => dice.value));
        alignDice();
    }
}

function alignDice() {
    diceArray
        .sort((a, b) => a.mesh.position.x - b.mesh.position.x)
        .forEach((die, idx) => {
            die.moveTo({
                x: [-3, -1.5, 0, 1.5, 3][idx],// The desired Y positions for the dice, evenly spaced,
                y: alignedDiceHeight,
                z: 0
            });
            let value = 6;
            let [x, y, z] = [[0, 0, 0], [90, 90, 0], [90, 180, 0], [90, 0, 0], [90, -90, 0], [0, 0, 180]][value - 1];
            die.rotateTo({
                //x,
                y,
                z
            });
        });
}

function updateSceneSize() {
    camera.aspect = canvasWidth / canvasHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWidth, canvasHeight);

    // calculate scene boundary
    // Top left corner in screen space
    var topLeft = THREE_Vector3(-1, 1, 0).unproject(camera);
    // Bottom right corner in screen space
    var bottomRight = THREE_Vector3(1, -1, 0).unproject(camera);
    var worldWidth = bottomRight.x - topLeft.x;
    var worldHeight = bottomRight.y - topLeft.y;
    //console.warn(worldWidth, worldHeight, topLeft, bottomRight);
}

function throwDice() {
    scoreResult.innerHTML = '';
    var diceTimeout = setTimeout(() => {
        console.log("timeout");
    }, 5000);

    diceArray.forEach((die, idx) => {
        var rand = () => 4 * Math.PI * Math.random();
        var { body, mesh } = die;
        die.rolling = true;
        die.hitwall = false;
        body.velocity.setZero();
        body.angularVelocity.setZero();
        var [x, y, z] = dropPositions[idx] || dropPositions[0];
        x += dropXoffset;
        body.position = CANNON_Vector3(x, y, z);
        mesh.position.copy(body.position);
        mesh.rotation.set(rand(), 0, rand());
        body.quaternion.copy(mesh.quaternion);
        body.applyImpulse(
            CANNON_Vector3(-diceThrowImpulse, diceThrowImpulse, 0),
            CANNON_Vector3(diceThrowRotation, diceThrowRotation, 0)
        );
        body.allowSleep = true;
    });
}
