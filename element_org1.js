//import * as CANNON from './dependencies/cannon-es.js';
// todo fix error CANNON.Vec3 is not a constructor
import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

//import * as THREE from 'https://unpkg.com/three@latest/build/three.module.js';
//import * as BufferGeometryUtils from 'https://unpkg.com/three@latest/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from './dependencies/three.min.js';
import * as BufferGeometryUtils from './dependencies/BufferGeometryUtils.js';

console.warn(BufferGeometryUtils);
// THREE helper functions
var THREE_Vector2 = (x = 0, y = 0) => new THREE.Vector2(x, y);
var THREE_Vector3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
var CANNON_Vector3 = (x = 0, y = 0, z = 0) => new CANNON.Vec3(x, y, z);
var CANNON_Body = (b) => new CANNON.Body(b);
var CANNON_Box = (b) => new CANNON.Box(b);

function log(...args) {
    let a1 = args.shift();
    console.log(`%c ${a1} `, "background:blue;color:white", ...args);
}
const /* function */createBoxGeometry = (diceEdgeRadius) => {
    var diceSegments = 28; // 25-60 more segments is more mesh, better quality
    var diceNotchRadius = .13; // .13 higher is dots touching eachother on 6 dice
    var diceNotchDepth = .13; // .13 more depth is more/wider black dot
    var size = 1; // 1
    var boxGeometry = new THREE.BoxGeometry(size, size, size, diceSegments, diceSegments, diceSegments);
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
            v = (1 / diceNotchRadius) * v;
            v = Math.PI * Math.max(-1, Math.min(1, v));
            return diceNotchDepth * (Math.cos(v) + 1);
        }
        var notch = (pos) => notchWave(pos[0]) * notchWave(pos[1]);
        var offset = .25; // spread dots on side
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
    console.error(BufferGeometryUtils);
    boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);
    boxGeometry.computeVertexNormals();
    return boxGeometry;
}

class DIE {
    render() {
        // inject custom element
        this.customElement.render();
    }
    constructor(customElement) {
        this.customElement = customElement;
        var D = this;
        //-------------------------------------------- create dice mesh
        var wireframe = false;

        var boxMaterialOuter = [
            new THREE.MeshStandardMaterial({ color: customElement.dicecolor, wireframe }),
            new THREE.MeshStandardMaterial({ color: customElement.dicecolor, wireframe }),
            new THREE.MeshStandardMaterial({ color: customElement.dicecolor, wireframe }),
            new THREE.MeshStandardMaterial({ color: customElement.dicecolor, wireframe }),
            new THREE.MeshStandardMaterial({ color: customElement.dicecolor, wireframe }),
            new THREE.MeshStandardMaterial({ color: customElement.dicecolor, wireframe })
        ];
        var M = D.mesh = new THREE.Group();
        var diceEdgeRadius = .13; // .13-.2 rounded corners of the dice
        var baseGeometry = new THREE.PlaneGeometry(1 - 2 * diceEdgeRadius, 1 - 2 * diceEdgeRadius);
        var diceDotOffset = .485; // how far the inner BLACK dots are from the center of the dice
        var innerMesh = new THREE.Mesh(
            BufferGeometryUtils.mergeGeometries([
                baseGeometry.clone().translate(0, 0, -diceDotOffset), // side 1
                baseGeometry.clone().rotateY(.5 * Math.PI).translate(diceDotOffset, 0, 0), // side 2
                baseGeometry.clone().translate(0, 0, diceDotOffset), // side 3
                baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, diceDotOffset, 0), // side 4
                baseGeometry.clone().rotateY(.5 * Math.PI).translate(-diceDotOffset, 0, 0), // side 5
                baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, -diceDotOffset, 0), // side 6
            ], false)
            ,
            new THREE.MeshStandardMaterial({
                color: customElement.dotcolor,
                roughness: 0,
                metalness: 1,
                side: THREE.DoubleSide,
            }));
        var outerMesh = new THREE.Mesh(
            createBoxGeometry(diceEdgeRadius),
            boxMaterialOuter
        );
        //innerMesh.castShadow = true;
        outerMesh.castShadow = true;
        D.mesh.add(innerMesh, outerMesh);
        // end create dice mesh

        var P = M.position;
        var R = M.rotation;
        var body = CANNON_Body({
            mass: customElement.mass,
            shape: CANNON_Box(CANNON_Vector3(.5, .5, .5)),
            sleepTimeLimit: .1,
        });
        this.animating = false;
        customElement.scene.add(M);
        customElement.world.addBody(body);
        Object.assign(this, {
            mesh: M,
            body,
            X: (x = 0) => {
                P.x = x;
                this.render();
            },
            Y: (y = 0) => {
                P.y = y;
                this.render();
            },
            Z: (z = 0) => {
                P.z = z;
                this.render();
            },
            moveTo: ({
                x = P.x,
                y = P.y,
                z = P.z,
                speed = 1,
                vector = THREE_Vector3(x, y, z) }
            ) => {
                this.animating = true;
                setTimeout(() => this.animating = false, this.timeout_moveTo);
                //this.colorByValue({ color: "green", value: 0 });
                var A = () => {
                    var toTarget = vector.clone().sub(P); // Calculate the vector from the dice to the target
                    if (this.animating && toTarget.length() >= 1) { // If the dice is not close enough to the target, move it
                        toTarget.normalize().multiplyScalar(speed);
                        P.add(toTarget);
                        requestAnimationFrame(A);
                    } else { // If the dice is close enough to the target, stop moving it
                        this.animating = false;
                        P.copy(vector);
                        body.position.copy(vector);
                        P.x = x;
                        P.y = y;
                        P.z = z;
                        //console.warn("done moveTo", body.id, "value:", this.value, "P:", P, "\n", toTarget);
                    }
                    this.render()
                }
                A();
            },
            toFloor: ({ y = 0, delay = 0 }) => {
                const executeWhenNotAnimating = () => {
                    if (!this.animating) {
                        console.error("wait for animating false", this.animating);
                        setTimeout(() => {
                            this.moveTo({
                                x: P.x + [-1.5, -.5, 0, 1, 2][this.sortidx],
                                y,
                                z: 0,
                            });
                        }, delay);
                    } else {
                        setTimeout(executeWhenNotAnimating, 100);
                    }
                }
                executeWhenNotAnimating();
            },
            select: () => {
                this.selected = !this.selected;
                this.color = this.selected ? this.diceselectedcolor : customElement.dicecolor;
                this.moveTo({
                    x: this.selected
                        ? P.x + customElement.selectedDiceOffsetX[this.sortidx]
                        : customElement.alignedDiceX[this.sortidx],
                    y: this.selected
                        ? 0
                        : customElement.alignedDiceY,
                    z: this.selected
                        ? 0
                        : customElement.alignedDiceZ
                })
                this.render();
            },
            rotateTo: ({
                x = R.x,
                y = R.y,
                z = R.z,
                speed = .05
            }) => {
                console.log("rotateTo", x, y, z);
                var euler = new THREE.Euler().setFromQuaternion(M.quaternion);
                const radians = angle => angle * (Math.PI / 180);
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
                    animating = animate(target.x) || animate(target.y) || animate(target.z);
                    if (animating) {
                        R.x += (target.x = Math.sign(target.x) * speed);
                        R.y += (target.y = Math.sign(target.y) * speed);
                        R.z += target.z = Math.sign(target.z) * speed;
                        requestAnimationFrame(A);
                    } else {
                        R.copy(euler);
                    }
                    this.render()
                }
                A();
            },
            nudge: () => {
                var impulse = () => ((Math.random() - 0.5) * 1.5);//customElement.nudgeMagnitude) / 6;
                const force = 3 + 5 * Math.random();
                // console.warn("nudge", D.id);
                body.applyImpulse(CANNON_Vector3(
                    impulse(),
                    impulse(),
                    impulse()
                ), P)
            },
            sleep: () => {
                var die = this;
                console.log("sleep dice", body.id);
                body.allowSleep = false;
                var euler = CANNON_Vector3();
                body.quaternion.toEuler(euler);
                var eps = .05;
                var isZero = (angle) => Math.abs(angle) < eps;
                var isHalfPi = (angle) => Math.abs(angle - .5 * Math.PI) < eps;
                var isMinusHalfPi = (angle) => Math.abs(.5 * Math.PI + angle) < eps;
                var isPiOrMinusPi = (angle) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);
                var nudgeDie = (status = "") => {
                    // landed on edge => wait to fall on side and fire the event again
                    // console.warn("nudge die", body.id, status, die.value);
                    body.allowSleep = true;
                    die.nudge();
                }
                var stoppedRolling = (value) => {
                    die.value = value;
                    die.rolling = false;
                    if (M.position.y > 1) nudgeDie("stacked dice");
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
                        nudgeDie("landed on edge1");
                    }
                } else if (isHalfPi(euler.z)) {
                    stoppedRolling(2);
                } else if (isMinusHalfPi(euler.z)) {
                    stoppedRolling(5);
                } else {
                    nudgeDie("landed on egde2");
                }
            },
        });// Object.assign(this,{})
    }
    get sideorder() {
        return [2, 5, 1, 6, 3, 4];
    }
    get material() {
        return this.mesh.children[1].material; // returns array for dice values 2,5,1,6,3,4
    }
    get color() {
        return this.material.color;
    }
    set color(color = "white") {
        var material = this.material;
        if (Array.isArray(material)) {
            material.forEach(side => side.color.set(color));
        } else this.material.color.set(color);
        //render_scene();
    }
    colorByValue({ color = customElement.dicecolor, value = this.value }) {
        var side = this.sideorder.indexOf(value);
        if (value && side) { // value=0 colors whole die
            this.material[side].color.set(color);
        } else {
            this.color = color;
        }
    }
}

const /* function */addRay = () => {
    // Define a BufferGeometry for the ray line
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    var rayLine = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: 0xff0000 }) // Define a material for the ray line
    );
    this.scene.add(rayLine);// Add the ray line to the scene
    this.canvas.addEventListener('click', /* function */(event) => {
        // Normalize mouse position to -1 to 1
        var mouse = THREE_Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        addLine(mouse.x, mouse.y);
    });
}

const /* function */alignDice = () => {
    this.diceArray
        .sort((a, b) => a.mesh.position.x - b.mesh.position.x)
        .forEach((die, idx) => {
            die.selected = false;
            die.color = this.dicecolor;
            die.sortidx = idx;
            die.moveTo({
                // The desired Y positions for the dice, evenly spaced,
                x: this.alignedDiceX[idx],
                y: this.alignedDiceY,
                z: this.alignedDiceZ
            });
            let value = 6;
            let [x, y, z] = [[0, 0, 0], [90, 90, 0], [90, 180, 0], [90, 0, 0], [90, -90, 0], [0, 0, 180]][value - 1];
            // die.rotateTo({
            //     //x,
            //     y,
            //     z
            // });
        });
}


customElements.define("roll-dice", class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        // create a unique ID, but using a DOM Node in the constructor would be nicer
        let id = "id" + Math.random() * 1e18;
        this.innerHTML = `<canvas id="canvas" style="width:90vw;height:90vh"></canvas>
            <button id="roll-btn" style="zoom:2">Throw the dice</button>`;
        this.onclick = (e) => this.roll();

        this.INITDICE(THREE, CANNON, BufferGeometryUtils);
        window.addEventListener('resize', this.updateSceneSize);
        window.addEventListener('dblclick', () => this.throwDice());
        document.querySelector('#roll-btn').onclick = () => this.throwDice();
        this.canvas.addEventListener('mousemove', (event) => {
            this.checkDieSideClick(event);
        });
        this.canvas.addEventListener('click', (event) => {
            if (this.overdice) {
                this.overdice.select();
            }
        });
    }
    roll() {

    }
    /* -------------------------------------------------------------------------- */
    INITDICE(
        THREE,
        CANNON,
        BufferGeometryUtils
    ) {
        this.DEBUG = this.hasAttribute("debug") || false;

        const getAttribute = (name, val = 0) => {
            let attr = this.getAttribute(name)
            if (!attr) return val;
            return parseFloat(attr, 10);
        }

        this.canvas = document.querySelector('#canvas');
        var { width, height } = this.canvas.getBoundingClientRect();
        this.canvas_width = width;
        this.canvas_height = height;

        this.walls = [];

        this.canvasWidth = this.canvas.offsetWidth;
        this.canvasHeight = this.canvas.offsetHeight;
        // minor difference, can one be used??
        //console.error(this.canvas_width,this.canvasWidth);

        this.showhelpers = this.hasAttribute("showhelpers") || false;

        this.dicecount = getAttribute("dicecount", 5);
        this.overdice = undefined; // the DIE the cursor was last over

        this.cameradistance = getAttribute("cameradistance", 5); // default:5 4=closer and large dice, 6 is farther away and smaller dice

        this.cameratilt = getAttribute("cameratilt", 1); // default:1
        this.cameraview = getAttribute("cameraview", 40) + (this.cameradistance * 5); // default:40 higher is farther away from dice
        this.camerapan = getAttribute("camerapan", 0);

        this.floorShadowY = -1;
        this.wallHeight = this.cameraview / 10;// - .5;
        this.wallOffset = this.cameraview / 10;// - .5;

        // create a die with 6 sides
        this.diceArray = [];
        this.dicecolor = this.getAttribute("dicecolor") || "white";
        this.diceselectedcolor = "lightgreen";
        this.dicehovercolor = "beige";
        this.diceHighlightColor = "red";

        this.dotcolor = this.getAttribute("dotcolor") || "black";

        // where the dice are thrown from and to
        var dropHeight = 6; // default:6 higher values throw dice outside the 4 walls
        var dropDistance = 1; // default:2 distance between dice when thrown
        var dropXoffset = dropHeight / 2; // default:4 distance to the right a dice starts falling
        this.dropPositions = [
            [0 + dropXoffset, dropHeight, 0],
            [-dropDistance + dropXoffset, dropHeight, -dropDistance],
            [dropDistance + dropXoffset, dropHeight, -dropDistance],
            [-dropDistance + dropXoffset, dropHeight, dropDistance],
            [dropDistance + dropXoffset, dropHeight, dropDistance],
        ];

        // where the dice are positioned after the throw
        this.selectedDiceOffsetX = [-1, -.5, 0, .5, 1];
        this.alignedDiceX = [-2.5, -1, 0.5, 2, 3.5]; // 6/5 = 
        this.alignedDiceY = 4;
        this.alignedDiceZ = 1;

        // physics parameters
        this.mass = getAttribute("mass", 1);
        this.gravityx = getAttribute("gravityx", 0); // rightward Gravity
        this.gravityy = getAttribute("gravityy", -50); // downward Gravity
        this.gravityz = getAttribute("gravityz", 0); // forward Gravity

        this.diceimpulse = getAttribute("diceimpulse", 4); // default:5 with how much Impulse force all dice are thrown 0 drops straight down
        this.dicerotation = getAttribute("dicerotation", 0.6); // default:0.7 how fast die rotates on start of throw, 0 is die drops down
        this.restitution = getAttribute("dicerestitution", 0.6); // 0-1 default: 0.6 how hard the floor bounces materials, higher is more bounce, above .6 dice can forever vibrate

        this.nudgeMagnitude = getAttribute("nudge", 1); // Adjust this value to change the strength of the impulse

        //if (DEBUG) [this.gravityx, this.gravityy, this.gravityz][1] = -550; restitution = 0.06; // DEBUG values

        // animation timeouts
        this.timeout_moveTo = 3000;
        this.timeout_rollingDice = 5000;


        // ============================================================================ init scene
        this.world = new CANNON.World({
            allowSleep: true,
            gravity: CANNON_Vector3(this.gravityx, this.gravityy, this.gravityz),
        });
        log("world", this.gravityx, this.gravityy, this.gravityz, this.restitution);
        this.world.defaultContactMaterial.restitution = this.restitution;
        // world.defaultContactMaterial = {
        //     friction: 0.9,
        //     restitution: 0.7,
        //     contactEquationStiffness: 1e7,
        //     contactEquationRelaxation: 1,
        //     frictionEquationStiffness: 1e7,
        //     frictionEquationRelaxation: 2,
        // };
        //world.defaultContactMaterial = { mass: 0, tension: 170, friction: 26 }
        // ============================================================================ init scene
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            canvas: this.canvas
        });
        this.renderer.shadowMap.enabled = true
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.scene = new THREE.Scene();
        //this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(
            this.cameraview, // field of view angle
            window.innerWidth / window.innerHeight, // aspect ratio
            .01, // near location "frustum"
            300 // far location "frustum"
        );
        this.camera.position.set(...[
            this.camerapan,
            this.cameradistance,
            this.cameratilt
        ]).multiplyScalar(2);
        this.camera.lookAt(0, 0, 0);

        this.updateSceneSize();

        var ambientLight = new THREE.AmbientLight(0xffffff, .5);
        this.scene.add(ambientLight);
        var topLight = new THREE.PointLight(0xffffff, .5);
        topLight.position.set(0, 25, this.wallHeight * 2);
        topLight.castShadow = true;
        topLight.shadow.mapSize.width = 2048;
        topLight.shadow.mapSize.height = 2048;
        topLight.shadow.camera.near = .1;
        topLight.shadow.camera.far = 1400;
        this.scene.add(topLight);
        //-------------------------------------------- add floor
        var floorOpacity = .1;
        var floor = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            //new THREE.PlaneGeometry(1,1),
            //new THREE.PlaneGeometry(0,0),
            new THREE.ShadowMaterial({
                opacity: floorOpacity,
            })
        )
        floor.receiveShadow = true;
        floor.position.y = this.floorShadowY;
        floor.quaternion.setFromAxisAngle(THREE_Vector3(-1, 0, 0), Math.PI * .5);
        this.scene.add(floor);
        var floorBody = CANNON_Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
        });
        floorBody.position.copy(floor.position);
        floorBody.quaternion.copy(floor.quaternion);
        this.world.addBody(floorBody);

        //-------------------------------------------- create diceArray
        //this.diceArray = 
        Array(this.dicecount)
            .fill(0)
            .map((i, idx) => {
                let die = window["d" + (idx + 1)] = new DIE(this);
                this.diceArray.push(die);
                die.body.addEventListener('sleep', (e) => die.sleep());
                die.body.addEventListener("collide", (evt) => walls.forEach(wall => {
                    if (evt.body === wall) {
                        console.log("Dice", die.body.id, " hit wall", wall.id);
                        die.hitwall = wall;
                    }
                }));
                return die;
            })
        this.raycaster = new THREE.Raycaster();

        if (this.showhelpers) {
            this.scene.add(new THREE.AxesHelper(this.wallHeight));
        }
        //-------------------------------------------- add walls
        var wallbase = 2; // does this mean the walls do not go down to the floor 0 ??
        var walls = [
            CANNON_Vector3(0, wallbase, this.wallOffset - 0.75),  // Front wall
            CANNON_Vector3(0, wallbase, -this.wallOffset), // Back wall
            CANNON_Vector3(this.wallOffset, wallbase, 0),  // Right wall
            CANNON_Vector3(-this.wallOffset, wallbase, 0), // Left wall
        ].map((wall, idx) => {
            var wallBody = CANNON_Body({
                mass: 0, // static immovable body
            });
            wallBody.addShape(
                CANNON_Box(CANNON_Vector3(this.wallHeight, this.wallHeight, 0)) // Half extents = half the width, height, depth
            );
            wallBody.position.copy(wall);
            this.world.addBody(wallBody);
            var wallThinkness = .001;
            var wallMesh = new THREE.Mesh(
                new THREE.BoxGeometry(this.wallOffset * 5, this.wallHeight, wallThinkness), // Full width, height, depth to match the Cannon.js shape
                new THREE.MeshBasicMaterial(
                    this.DEBUG ? {
                        color: [
                            0xff0000, // Red
                            0x00ff00, // Green
                            0x0000ff, // Blue
                            0xffff00  // Yellow
                        ][idx], // wall color                
                        //wireframe: true,
                        transparent: true,
                        opacity: 0.5
                    }
                        : {
                            opacity: 0,
                            transparent: true
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
            wallMesh.visible = this.showhelpers;
            this.scene.add(wallMesh);
            return wallBody;
        });

        // addRay();
        this.throwDice();
    }
    /* -------------------------------------------------------------------------- */
    updateSceneSize() {
        let width = this.canvasWidth;
        let height = this.canvasHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        // calculate scene boundary
        // Top left corner in screen space
        var topLeft = THREE_Vector3(-1, 1, 0).unproject(this.camera);
        // Bottom right corner in screen space
        var bottomRight = THREE_Vector3(1, -1, 0).unproject(this.camera);
        var worldWidth = bottomRight.x - topLeft.x;
        var worldHeight = bottomRight.y - topLeft.y;
        //console.warn(worldWidth, worldHeight, topLeft, bottomRight);
    }
    /* -------------------------------------------------------------------------- */
    throwDice() {
        log("throwDice");
        //const rand = () => 4 * Math.PI * Math.random();
        const rand = () => 0;
        this.diceArray.forEach((die, idx) => {
            var { body, mesh } = die;
            if (!die.selected) {
                die.animating = true;
                die.rolling = true;
                die.hitwall = false;
                body.velocity.setZero();
                body.angularVelocity.setZero();
                var [x, y, z] = this.dropPositions[idx] || this.dropPositions[0];
                x = 0;
                body.position = CANNON_Vector3(x, 6, z);
                mesh.position.copy(body.position);
                mesh.rotation.set(rand(), 0, rand());
                console.log(x, y, z, mesh.rotation);
                body.quaternion.copy(mesh.quaternion);

                console.warn(x, y, z, this.diceimpulse, this.dicerotation);
                // body.applyImpulse(
                //     CANNON_Vector3(-this.diceimpulse, this.diceimpulse, 1),
                //     CANNON_Vector3(this.dicerotation, this.dicerotation, .2)
                // );
                let force = 3 + 5 * Math.random();
                body.applyImpulse(
                    CANNON_Vector3(-force, force, 0),
                    CANNON_Vector3(0, 0, .2)
                );
                console.error(body.force);

                body.allowSleep = true;
            } else {
                console.warn("hold", body.id, "value", die.value, die.mesh.position);
            }
        });
        this.render_rolling_dice();
    }
    /* -------------------------------------------------------------------------- */
    render_scene() {
        console.log("render", this.camera);
        this.renderer.render(this.scene, this.camera);
    }
    /* -------------------------------------------------------------------------- */
    render_rolling_dice() {
        log("render_rolling_dice");
        var framecounter = 0;
        this.world.fixedStep();
        const A = () => {
            framecounter++;
            var animate = true;
            //        setTimeout(() => animate = false, this.timeout_rollingDice);
            if (animate && framecounter < 10 && this.diceArray.map(die => {
                console.log(`frame ${framecounter}`, die.body.id, die.body.position);
                die.mesh.position.copy(die.body.position);
                die.mesh.rotation.x += 0.01;
                die.mesh.rotation.y += 0.01;
                console.error(die.mesh.rotation);
                die.mesh.quaternion.copy(die.body.quaternion);
                return die.rolling
            }).filter(Boolean).length) {
                this.render_scene();
                requestAnimationFrame(A);
            } else {
                console.log("done rolling", this.diceArray.map((dice, idx) => dice.value));
                //alignDice();
                //d1.color = this.diceHighlightColor;
                //d1.select();
                // d1.toFloor({
                //     y: 0,
                //     delay:2e3
                // });
            }
        }
        A();
    }
    /* -------------------------------------------------------------------------- */
    checkDieSideClick(event) {
        var line;
        var vector = THREE_Vector3(
            (event.clientX / this.canvas_width) * 2 - 1,
            -(event.clientY / this.canvas_height) * 2 + 1,
            0.5
        );
        vector.unproject(this.camera);
        this.raycaster.set(
            this.camera.position,
            vector.sub(this.camera.position).normalize()
        );
        var resetDIE = (d) => {
            if (d) {
                d.color = d.selected ? this.diceselectedcolor : this.dicecolor;
                d.mouseover = false;
            }
            this.overdice = undefined;
        }
        var nowoverdice = this.diceArray.filter(dice => {
            var intersects = this.raycaster.intersectObject(dice.mesh);
            if (intersects.length) {
                if (!dice.mouseover) {
                    // var index = Math.floor(intersects[0].faceIndex / 2);
                    // console.warn("id:", dice.body.id, "value:", dice.value, "side:", index + 1,dice.color);
                    resetDIE(this.overdice);
                    this.overdice = dice;
                    dice.mouseover = true;
                    dice.color = this.dicehovercolor;
                }
                return dice;
            } else {
                if (this.overdice == dice) {
                    resetDIE(dice);
                }
            }
        });
        if (nowoverdice.length) {
            //console.log(nowoverdice);
            this.canvas.style.cursor = "pointer";
        } else {
            this.canvas.style.cursor = "inherit";
            resetDIE(this.overdice);
        }
        this.render_scene();
    }
    /* -------------------------------------------------------------------------- */
    addLine(x, y, z = 0) {
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
        this.scene.add(line);// Add the line to your scene
        this.render_scene()
        return line;
    }
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */


})

console.log("element.js loaded")

