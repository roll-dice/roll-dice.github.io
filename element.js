if (location.host == "roads-technology.nl") console.log("This code is a mess, but it works");

var DEBUG = 0;

//import * as CANNON from './dependencies/cannon-es.js';
// todo fix error CANNON.Vec3 is not a constructor
import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

//import * as THREE from 'https://unpkg.com/three@latest/build/three.module.js';
//import * as BufferGeometryUtils from 'https://unpkg.com/three@latest/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from './dependencies/three.min.js';
import * as BufferGeometryUtils from './dependencies/BufferGeometryUtils.js';

customElements.define("roll-dice", class extends HTMLElement {
    connectedCallback() {
        // create a unique ID, but using a DOM Node in the constructor would be nicer
        let id = "id" + Math.random() * 1e18;
        this.innerHTML = `<canvas id="canvas"></canvas>`;
        Object.assign(
            this,
            // assign {} return value to Web Component
            /**
             * dice - array
             * roll - function
             */
            INITDICE({ customElement: this, THREE, CANNON, BufferGeometryUtils })
        );
        this.ondoubleclick = (e) => this.roll();
    }
    dispatch(name, detail = {}) {
        detail = Object.assign({
            ...detail,
            name,
            element: this,
            values: () => this.dice.map(die => die.value)
        }, this);
        console.warn("%c event: ", "background:purple;color:gold", name, detail);
        this.dispatchEvent(
            new CustomEvent(this.nodeName.toLowerCase(), {
                bubbles: true,
                composed: true,
                detail

            })
        );
    }
})

function INITDICE({
    customElement,
    THREE,
    CANNON,
    BufferGeometryUtils
}) {
    customElement.log = customElement.hasAttribute("log");

    DEBUG = customElement.hasAttribute("debug");

    var attr = (name, defaultValue = false) => customElement.getAttribute(name) || defaultValue || false;
    var canvas = document.querySelector('#canvas');
    var { width: canvas_width, height: canvas_height } = canvas.getBoundingClientRect();

    var br = (customElement.parentNode).getBoundingClientRect();
    var br = (canvas).getBoundingClientRect();
    var pixels_above_canvas = br.top;
    var pixels_leftof_canvas = br.left;
    console.error(br.top);
    // canvas.setAttribute("width",br.width);
    // canvas.setAttribute("height",br.height);

    var walls = [], rayLine;

    var canvasWidth = canvas.offsetWidth;
    var canvasHeight = canvas.offsetHeight;

    var showHelpers = DEBUG && 1;

    var dicecount = ~~(attr("dicecount", 5));
    var overdice = undefined; // the DIE the cursor was last over

    var size = 5; // default:5
    var camera = 1; // default:1

    var cameraFieldOfView = 40 + (size * 5); // default:40 higher is farther away from dice
    var cameraPosition = [0, size, camera];
    var floorShadowY = -1;
    var wallHeight = cameraFieldOfView / 10 - .5;
    var wallOffset = cameraFieldOfView / 10 - .5;

    // create a die with 6 sides
    var diceArray = [];
    var diceColor = attr("dicecolor", "white");
    var diceSelectedColor = attr("diceselectedcolor", "lightgreen");
    var diceHoverColor = attr("dicehovercolor", "beige");
    var diceHighlightColor = "red";

    var dotColor = attr("dotcolor", "black");
    var diceDotOffset = .485; // how far the inner BLACK dots are from the center of the dice
    var diceSegments = 28; // 25-60 more segments is more mesh, better quality
    var diceEdgeRadius = .13; // .13-.2 rounded corners of the dice
    var diceNotchRadius = .13; // .13 higher is dots touching eachother on 6 dice
    var diceNotchDepth = .13; // .13 more depth is more/wider black dot

    // where the dice are thrown from and to
    var dropHeight = 6; // default:6 higher values throw dice outside the 4 walls
    var dropDistance = 2; // default:2 distance between dice when thrown
    var dropXoffset = dropHeight / 2; // default:4 distance to the right a dice starts falling
    var dropPositions = [
        [0, dropHeight, 0],
        [-dropDistance, dropHeight, -dropDistance],
        [dropDistance, dropHeight, -dropDistance],
        [-dropDistance, dropHeight, dropDistance],
        [dropDistance, dropHeight, dropDistance],
    ];
    var wallbase = 4;

    // where the dice are positioned after the throw
    var alignlayout = 1;// 0=line 1=5
    var alignedDiceX = [ // LEFT TO RIGHT
        0,//0 not used, so index matches dicecount
        1, 2, 3, 4,
        /* 5 */[[-2.5, -1, 0.5, 2, 3.5], [-1, -1, 0.5, 2, 2]][alignlayout],
        6, 7, 9,
        [-4.5, -3.1, -2, -1, .25, 1.3, 2.5, 4],
    ][dicecount];
    var alignedDiceY = [ // HEIGTH
        0,//0 not used, so index matches dicecount
        1, 2, 3, 4,
        [[6, 6, 6, 6, 6], [7, 7, 7, 7, 7, 7]][alignlayout],
        6, 7, 8, 9][dicecount];
    var alignedDiceZ = [// TOP-BOTTOM
        0,//0 not used, so index matches dicecount
        1, 2, 3, 4,
        [[1, 1, 1, 1, 1], [0.125, 2.25, 1.25, 2.25, 0.125]][alignlayout],
        6, 7, 8, 9][dicecount];

    var [alignedDiceOffsetX = 0, alignedDiceOffsetY = 0, alignedDiceOffsetZ = 0] = (attr("aligndice") || "0,0,0").split(",");
    console.warn(alignedDiceX, alignedDiceY, alignedDiceZ, "\n", alignedDiceOffsetX);
    alignedDiceOffsetX = Number(alignedDiceOffsetX);
    alignedDiceOffsetY = Number(alignedDiceOffsetY);
    alignedDiceOffsetZ = Number(alignedDiceOffsetZ);
    var selectedDiceOffsetX = [
        0,//0 not used, so index matches dicecount
        1, 2, 3, 4,
        /* 5 */[[-2.5, -1, 0.5, 2, 3.5], [-1, -1, 0.5, 2, 2]][alignlayout],
        6, 7,
        [-1, -.5, 0, .5, 1, 1.4, 1.8, 2.2],
    ][dicecount];
    //[...alignedDiceX.map(x => x + alignedDiceOffsetX)]
    //[alignlayout]][dicecount];

    // physics parameters
    var body_mass = attr("mass", 1.5);
    var gravityX = attr("gravityx", -4); // rightward Gravity
    var gravityY = -attr("gravityy", 50); // downward Gravity
    var gravityZ = attr("gravityz", 0); // forward Gravity
    var gravity = [gravityX, gravityY, gravityZ];
    var diceThrowImpulse = attr("diceimpulse", 5); // default:5 with how much Impulse force all dice are thrown 0 drops straight down
    var diceThrowRotation = attr("dicerotation", 0.6); // default:0.6
    var worldBounceRestitution = attr("restitution", 0.6); // default: 0.6 how hard the floor bounces materials, higher is more bounce, above .6 dice can forever vibrate
    var nudgeMagnitude = 3; // Adjust this value to change the strength of the impulse

    if (DEBUG) gravity[1] = -550; worldBounceRestitution = 0.06; // DEBUG values

    // animation timeouts
    var timeout_moveTo = 3000;
    var timeout_rollingDice = 5000;

    // THREE helper functions
    var THREE_Vector2 = (x = 0, y = 0) => new THREE.Vector2(x, y);
    var THREE_Vector3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    var CANNON_Vector3 = (x = 0, y = 0, z = 0) => new CANNON.Vec3(x, y, z);
    var CANNON_World = (b) => new CANNON.World(b);
    var CANNON_Body = (b) => new CANNON.Body(b);
    var CANNON_Box = (b) => new CANNON.Box(b);

    var render_scene = () => {
        renderer.render(scene, camera);
    }

    var radians = angle => angle * (Math.PI / 180);

    class DIE {
        constructor() {
            var D = this;
            var M = D.mesh = createDiceMesh(); // create a unique mesh for each die, so we can color each die
            var P = M.position;
            var R = M.rotation;
            var body = CANNON_Body({
                mass: body_mass,
                shape: CANNON_Box(CANNON_Vector3(.5, .5, .5)),
                sleepTimeLimit: .1,
            });
            this.animating = false;
            scene.add(M);
            world.addBody(body);
            //body.addEventListener('sleep', (e) => sleepDice(body));
            Object.assign(this, {
                mesh: M,
                body,
                X: (x = 0) => {
                    P.x = x;
                    render_scene();
                },
                Y: (y = 0) => {
                    P.y = y;
                    render_scene();
                },
                Z: (z = 0) => {
                    P.z = z;
                    render_scene();
                },
                moveTo: ({
                    x = P.x,
                    y = P.y,
                    z = P.z,
                    speed = 1,
                    vector = THREE_Vector3(x, y, z) }
                ) => {
                    this.animating = true;
                    setTimeout(() => this.animating = false, timeout_moveTo);
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
                            if (customElements.log) console.warn("done moveTo", body.id, "value:", this.value, "P:", P, "\n", toTarget);
                        }
                        render_scene()
                    }
                    A();
                },
                toFloor: ({ y = 0, delay = 0 }) => {
                    const executeWhenNotAnimating = () => {
                        if (!this.animating) {
                            if (customElements.log) console.error("wait for animating false", this.animating);
                            setTimeout(() => {
                                this.moveTo({
                                    x: P.x + [-1.5, -.5, 0, 1, 2, 2.5, 3, 3.3][this.sortidx],
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
                    this.color = this.selected ? diceSelectedColor : diceColor;
                    this.moveTo({
                        x: this.selected
                            // ? P.x + selectedDiceOffsetX[this.sortidx]
                            ? alignedDiceX[this.sortidx]
                            : alignedDiceX[this.sortidx],
                        y: this.selected
                            // ? 0 
                            ? Number(customElement.getAttribute("selectedheight"))
                            // ? alignedDiceY[this.sortidx]-2
                            : alignedDiceY[this.sortidx],
                        z: this.selected
                            // ? 0
                            ? alignedDiceZ[this.sortidx]
                            : alignedDiceZ[this.sortidx]
                    });
                    customElement.dispatch('dice-selected', { selecteddice: this });
                    render_scene();
                },
                rotateTo: ({
                    x = R.x,
                    y = R.y,
                    z = R.z,
                    speed = .05
                }) => {
                    if (customElements.log) console.log(x, y, z);
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
                        animating = animate(target.x) || animate(target.y) || animate(target.z);
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
                    if (customElements.log) console.warn("nudge", D.id);
                    body.applyImpulse(CANNON_Vector3(
                        (Math.random() - 0.5) * nudgeMagnitude,
                        (Math.random() - 0.5) * nudgeMagnitude,
                        (Math.random() - 0.5) * nudgeMagnitude
                    ), P)
                },
                sleep: () => {
                    var die = this;
                    if (customElements.log) console.log("sleep dice", body.id);
                    body.allowSleep = false;
                    var euler = CANNON_Vector3();
                    body.quaternion.toEuler(euler);
                    var eps = .1;
                    var isZero = (angle) => Math.abs(angle) < eps;
                    var isHalfPi = (angle) => Math.abs(angle - .5 * Math.PI) < eps;
                    var isMinusHalfPi = (angle) => Math.abs(.5 * Math.PI + angle) < eps;
                    var isPiOrMinusPi = (angle) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);
                    var nudgeDie = (status = "") => {
                        // landed on edge => wait to fall on side and fire the event again
                        if (customElements.log) console.warn("nudge die", body.id, status, die.value);
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
        colorByValue({ color = diceColor, value = this.value }) {
            var side = this.sideorder.indexOf(value);
            if (value && side) { // value=0 colors whole die
                this.material[side].color.set(color);
            } else {
                this.color = color;
            }
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
        diceArray = Array(dicecount).fill(0).map((i, idx) => {
            var die = window["d" + (idx + 1)] = new DIE();
            diceArray.push(die);
            die.body.addEventListener('sleep', (e) => die.sleep());
            //detectWallCollisions(die);
            return die;
        })
        var raycaster = new THREE.Raycaster();

        if (showHelpers) {
            scene.add(new THREE.AxesHelper(wallHeight));
        }
        addWalls();
        // addRay();
        //showFloor();
        throwDice();
    }
    // ==================================== init event listeners
    window.addEventListener('resize', updateSceneSize);

    if (customElement.hasAttribute("doubleclick")) {
        customElement.addEventListener('dblclick', throwDice);
    }
    let rollButton = document.querySelector('#roll-btn');
    if (rollButton) {
        rollButton.onclick = throwDice;
    }

    canvas.addEventListener('mousemove', (event) => {
        checkDieSideHoverClick(event);
    });
    canvas.addEventListener('click', (event) => {
        if (overdice) {
            overdice.select();
        }
    });
    function addRay() {
        // Define a BufferGeometry for the ray line
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        rayLine = new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({ color: 0xff0000 }) // Define a material for the ray line
        );
        scene.add(rayLine);// Add the ray line to the scene
        canvas.addEventListener('click', function (event) {
            // Normalize mouse position to -1 to 1
            var mouse = THREE_Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );
            addLine(mouse.x, mouse.y);
        });
    }

    function checkDieSideHoverClick(event) {
        var xvector = ((event.clientX) / canvas_width) * 2 - 1;
        var yvector = -((event.clientY - pixels_above_canvas) / canvas_height) * 2 + 1;
        var vector = THREE_Vector3(xvector, yvector, 0.5);
        console.warn(event.clientX, event.clientY, canvas_width, canvas_height, xvector,yvector);
        vector.unproject(camera);
        raycaster.set(camera.position, vector.sub(camera.position).normalize());
        /* function */var resetDIE = (d) => {
            if (d) {
                d.color = d.selected ? diceSelectedColor : diceColor;
                d.mouseover = false;
            }
            overdice = undefined;
        }
        var nowoverdice = diceArray.filter(dice => {
            var intersects = raycaster.intersectObject(dice.mesh);
            if (intersects.length) {
                if (!dice.mouseover) {
                    // var index = Math.floor(intersects[0].faceIndex / 2);
                    // console.warn("id:", dice.body.id, "value:", dice.value, "side:", index + 1,dice.color);
                    resetDIE(overdice);
                    overdice = dice;
                    dice.mouseover = true;
                    dice.color = diceHoverColor;
                }
                return dice;
            } else {
                if (overdice == dice) {
                    resetDIE(dice);
                }
            }
        });
        if (nowoverdice.length) {
            //console.log(nowoverdice);
            canvas.style.cursor = "pointer";
        } else {
            canvas.style.cursor = "inherit";
            resetDIE(overdice);
        }
        render_scene();
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
        walls = [
            CANNON_Vector3(0, wallbase, wallOffset - 0.75),  // Front wall
            CANNON_Vector3(0, wallbase, -wallOffset), // Back wall
            CANNON_Vector3(wallOffset, wallbase, 0),  // Right wall
            CANNON_Vector3(-wallOffset, wallbase, 0), // Left wall
        ].map((wall, idx) => {
            var wallBody = CANNON_Body({
                mass: 0, // static immovable body
            });
            wallBody.addShape(
                CANNON_Box(CANNON_Vector3(wallHeight, wallHeight, 0)) // Half extents = half the width, height, depth
            );
            wallBody.position.copy(wall);
            world.addBody(wallBody);
            var wallThinkness = .001;
            var wallMesh = new THREE.Mesh(
                new THREE.BoxGeometry(wallOffset * 5, wallHeight, wallThinkness), // Full width, height, depth to match the Cannon.js shape
                new THREE.MeshBasicMaterial(
                    DEBUG ? {
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
            wallMesh.visible = showHelpers;
            scene.add(wallMesh);
            //wallBody.material.restitution = .5;
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

    function createBoxGeometry() {
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
    function createDiceMesh() {
        var wireframe = false;
        var boxMaterialOuter = [
            new THREE.MeshStandardMaterial({ color: diceColor, wireframe }),
            new THREE.MeshStandardMaterial({ color: diceColor, wireframe }),
            new THREE.MeshStandardMaterial({ color: diceColor, wireframe }),
            new THREE.MeshStandardMaterial({ color: diceColor, wireframe }),
            new THREE.MeshStandardMaterial({ color: diceColor, wireframe }),
            new THREE.MeshStandardMaterial({ color: diceColor, wireframe })
        ];
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
    function detectWallCollisions(die) {
        die.body.addEventListener("collide", (evt) => walls.forEach(wall => {
            if (evt.body === wall) {
                //console.log("Dice", die.body.id, " hit wall", wall.id);
                die.hitwall = wall;
            }
        }));
    }

    function render_rolling_dice() {
        world.fixedStep();
        var animate = true;
        setTimeout(() => animate = false, timeout_rollingDice);
        if (animate && diceArray.map(die => {
            die.mesh.position.copy(die.body.position);
            die.mesh.quaternion.copy(die.body.quaternion);
            return die.rolling
        }).filter(Boolean).length) {
            render_scene();
            requestAnimationFrame(render_rolling_dice);
        } else {
            if (customElements.log) console.log("done rolling", diceArray.map((dice, idx) => dice.value));
            alignDice();
            customElement.dispatch('dice-rolled');
            //d1.color = diceHighlightColor;
            //d1.select();
            // d1.toFloor({
            //     y: 0,
            //     delay:2e3
            // });
        }
    }

    function alignDice() {
        diceArray
            .sort((a, b) => a.mesh.position.x - b.mesh.position.x)
            .forEach((die, idx) => {
                die.selected = false;
                die.color = diceColor;
                die.sortidx = idx;
                if (customElements.log) console.log(idx, die.value, die.mesh.position);
                die.moveTo({
                    // The desired Y positions for the dice, evenly spaced,
                    x: alignedDiceX[idx] + alignedDiceOffsetX,
                    y: alignedDiceY[idx] + alignedDiceOffsetY,
                    z: alignedDiceZ[idx] + alignedDiceOffsetZ
                });
                let value = 6;
                // let [x, y, z] = [[0, 0, 0], [90, 90, 0], [90, 180, 0], [90, 0, 0], [90, -90, 0], [0, 0, 180]][value - 1];
                // die.rotateTo({
                //     x,
                //     y,
                //     z
                // });
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
        console.warn(worldWidth, worldHeight, topLeft, bottomRight);
    }

    function throwDice() {
        customElement.dispatch("dice-throw-start");
        var rand = () => 4 * Math.PI * Math.random();
        diceArray.forEach((die, idx) => {
            var { body, mesh } = die;
            if (!die.selected) {
                if (customElements.log) console.log("throw", body.id);
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
                    CANNON_Vector3(diceThrowRotation, diceThrowRotation, -diceThrowRotation)
                );
                body.allowSleep = true;
            } else {
                console.warn("hold", body.id, "value", die.value, die.mesh.position);
            }
        });
        render_rolling_dice();
    }
    return {
        dice: diceArray,
        roll: throwDice
    }
}
console.log("<roll-dice> element.js loaded")

// customElements.define("", class extends HTMLElement {
//     constructor() {
//         super()
//             .attachShadow({ mode: "open" })
//             .innerHTML = `<style></style>`;
//     }
//     connectedCallback() {
//         this.innerHTML = ``;
//     }
// })
