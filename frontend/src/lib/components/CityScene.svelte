<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Modal } from "@skeletonlabs/skeleton-svelte";
    import * as THREE from "three";
    import { Box3, Vector3 } from "three";
    import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
    import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

    import * as purchaseService from "$lib/api/purchase.js";
    import * as userService from "$lib/api/user.js";
    import * as blockService from "$lib/api/block.js";
    import * as authService from "$lib/api/auth.js";
    import { toaster } from "$lib/components/toaster.js";
    import _ from "lodash";
    import LoginForm from "$lib/components/LoginForm.svelte";
    import {
        createObjectManager,
        type ObjectManager,
    } from "./ObjectManager.js";

    let { user } = $props();
    let balance = $derived(user.balance);
    let blocks: any[] = [];

    let container: HTMLDivElement;

    let houseManager: ObjectManager | null = null;
    let treeManager: ObjectManager | null = null;

    let move = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        turnLeft: false,
        turnRight: false,
        up: false,
        down: false,
    };

    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;

    const tileSize = 100; // tile = 100x100 ô
    const gridCellSize = 30; // Mỗi ô lưới kích thước 1x1
    const gridNumCells = 3000; // Số ô trên mỗi chiều
    const gridTotalSize = gridCellSize * gridNumCells; // Tổng kích thước lưới
    const gridLineColor = 0x333333; // 0x79b9d3;

    // === CAMERA CONFIGURATION ===
    const CAMERA_CONFIG = {
        fov: 60,
        near: 0.1,
        far: 2000,
        angle: 60,
        horizontalDistance: 100,
        heightOffset: 100,
        get height() {
            return (
                Math.tan(THREE.MathUtils.degToRad(this.angle)) *
                    this.horizontalDistance +
                this.heightOffset
            );
        },
        get aspect() {
            return container.clientWidth / container.clientHeight;
        },
    };
    const SPEED = gridCellSize * 2;
    const TURN_SPEED = Math.PI / 10;
    let cameraRotationY = 0; // đơn vị: radian

    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let plane: THREE.Mesh;

    let loginModalState = $state(false);
    let logoutModalState = $state(false);
    let confirmBuyModalState = $state(false);

    let candidateCells: any[] | null = null;

    let isMobile = $state(false);

    let lastCameraPos = new THREE.Vector3();
    let lastCameraDir = new THREE.Vector3();
    let lastTiles: Set<string> = new Set();
    let lastFetchTime = 0;

    onMount(async () => {
        setup();
        await loadModels();
        createEventListeners();
        updateBlocksIfNeeded();

        // const isMobileOrTablet = () => {
        //     // modern way
        //     if (window.matchMedia("(pointer: coarse)").matches) return true;

        //     // fallback for some cases
        //     return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        // };

        // isMobile = isMobileOrTablet();
        // if (isMobile) {
        //     requestAnimationFrame(() => {
        //         bindMobileControls();
        //     });
        // }
    });

    onDestroy(() => {
        removeEventListeners();
    });

    function setup() {
        // Setup scene
        scene = new THREE.Scene();

        // Bầu trời màu xanh
        scene.background = new THREE.Color(0x87ceeb); // Sky blue

        // Camera góc nghiêng (nhìn từ trên chếch xuống)
        camera = new THREE.PerspectiveCamera(
            CAMERA_CONFIG.fov,
            CAMERA_CONFIG.aspect,
            CAMERA_CONFIG.near,
            CAMERA_CONFIG.far,
        );

        camera.position.set(0, CAMERA_CONFIG.height, 0);
        camera.lookAt(0, 0, 0);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // Grid
        // const gridHelper = new THREE.GridHelper(
        //     gridTotalSize,
        //     gridNumCells,
        //     gridLineColor,
        //     gridLineColor,
        // );
        // const material = gridHelper.material as THREE.Material;

        // if (Array.isArray(gridHelper.material)) {
        //     gridHelper.material.forEach((m: any) => {
        //         m.depthTest = false; // không so sánh z-buffer
        //         m.depthWrite = false; // không ghi vào z-buffer
        //         m.transparent = true;
        //         m.opacity = 0.15;
        //     });
        // } else {
        //     material.transparent = true;
        //     material.opacity = 0.15;
        //     gridHelper.material.depthTest = false;
        //     gridHelper.material.depthWrite = false;
        // }
        // scene.add(gridHelper);

        // Mặt phẳng vô hình để bắt raycast từ camera
        const planeGeometry = new THREE.PlaneGeometry(10000, 10000);
        // const planeMaterial = new THREE.MeshBasicMaterial({
        //     visible: false,
        //     color: 0xffffff,
        // });
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide, // để nhìn được cả 2 mặt
        });
        plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotateX(-Math.PI / 2); // Quay mặt phẳng nằm ngang
        scene.add(plane);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
        hemiLight.position.set(0, 200, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 100);
        scene.add(dirLight);

        let prevTime = performance.now();
        const animate = () => {
            const now = performance.now();
            const delta = (now - prevTime) / 1000;
            prevTime = now;

            // Xoay camera
            if (move.turnLeft) cameraRotationY -= TURN_SPEED * delta;
            if (move.turnRight) cameraRotationY += TURN_SPEED * delta;

            // Di chuyển theo hướng xoay
            const direction = new THREE.Vector3(
                Math.sin(cameraRotationY),
                0,
                Math.cos(cameraRotationY) * -1,
            );

            if (move.forward)
                camera.position.addScaledVector(direction, SPEED * delta);
            if (move.backward)
                camera.position.addScaledVector(direction, -SPEED * delta);
            //  if (move.left) camera.position.x -= moveSpeed;
            // if (move.right) camera.position.x += moveSpeed;

            if (move.up) camera.position.y += SPEED * delta;
            if (move.down) {
                camera.position.y -= SPEED * delta;
                if (camera.position.y < 10) {
                    camera.position.y = 10;
                }
            }

            // Camera luôn nhìn về hướng di chuyển
            const pitchAngle = Math.PI / 6;
            const target = camera.position
                .clone()
                .add(direction.setY(-Math.tan(pitchAngle)));
            camera.lookAt(target);

            updateBlocksIfNeeded();

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };

        animate();
    }

    async function loadModels() {
        const houseModel = await loadFbxModel("/3D/home.fbx");
        houseManager = createObjectManager(houseModel, gridCellSize, 100);
        scene.add(houseManager.mesh);

        const treeModel = await loadFbxModel("/3D/tree.fbx");
        treeManager = createObjectManager(treeModel, gridCellSize, 100);
        scene.add(treeManager.mesh);
    }

    async function loadFbxModel(url: string) {
        return new Promise((resolve: any) => {
            const loader = new FBXLoader();
            loader.load(url, (object: any) => {
                // Scale theo gridCellSize (ví dụ fit 1 ô 30x30)
                const box = new THREE.Box3().setFromObject(object);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = gridCellSize / maxDim;

                object.scale.set(scaleFactor, scaleFactor, scaleFactor);

                resolve(object);
            });
        });
    }

    const createEventListeners = () => {
        container.addEventListener("click", handleClick);
        window.addEventListener("resize", onResize);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
    };

    const removeEventListeners = () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        container.removeEventListener("click", handleClick);
    };

    const onResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };

    function handleKeyDown(event: KeyboardEvent) {
        switch (event.key) {
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
                // case "u":
                // case "d":
                event.preventDefault();
                break;
        }
        switch (event.key) {
            case "ArrowUp":
                move.forward = true;
                break;
            case "ArrowDown":
                move.backward = true;
                break;
            case "ArrowLeft":
                // move.left = true;
                move.turnLeft = true;
                break;
            case "ArrowRight":
                // move.right = true;
                move.turnRight = true;
                break;
            case "u":
                move.up = true;
                break;
            case "d":
                move.down = true;
                break;
        }
    }

    function handleKeyUp(event: KeyboardEvent) {
        switch (event.key) {
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
                // case "u":
                // case "d":
                event.preventDefault();
                break;
        }

        switch (event.key) {
            case "ArrowUp":
                move.forward = false;
                break;
            case "ArrowDown":
                move.backward = false;
                break;
            case "ArrowLeft":
                move.left = false;
                move.turnLeft = false;
                break;
            case "ArrowRight":
                move.right = false;
                move.turnRight = false;
                break;
            case "u":
                move.up = false;
                break;
            case "d":
                move.down = false;
                break;
        }
    }

    async function handleClick(event: any) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(plane);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const cell = {
                x: Math.floor(point.x / gridCellSize),
                y: Math.floor(point.z / gridCellSize),
            };

            const block = _.find(blocks, (block: any) => {
                return block.x === cell.x && block.y === cell.y;
            });
            if (block) {
                toaster.warning({
                    title: "Sorry, this block is no longer available",
                });
                return;
            }

            candidateCells = [cell];
            confirmBuyModalState = true;
        }
    }

    async function buy() {
        confirmBuyModalState = false;
        if (!candidateCells || candidateCells.length === 0) {
            return;
        }
        try {
            const purchaseResult =
                await purchaseService.purchase(candidateCells);
            if (purchaseResult) {
                toaster.success({
                    title: "Your purchase was successful.",
                });

                _.forEach(candidateCells, (cell: any) => {
                    addBlock(cell);
                });

                const gridX =
                    candidateCells[0].x * gridCellSize + gridCellSize / 2;
                const gridZ =
                    candidateCells[0].y * gridCellSize + gridCellSize / 2;
                showMoneyFly(
                    1000,
                    new THREE.Vector3(gridX, gridCellSize, gridZ),
                );

                user = await userService.getCurrentUser();
                candidateCells = null;
            }
        } catch (exception: any) {
            console.log(exception);
            toaster.error({
                title:
                    exception.response?.data?.error ??
                    exception.message ??
                    "Purchase failed. Please try again.",
            });
        }
    }

    function addBlock(cell: any) {
        // const gridX = cell.x * gridCellSize + gridCellSize / 2;
        // const gridZ = cell.y * gridCellSize + gridCellSize / 2;
        // const house = houseModel.clone(true);
        // house.position.set(gridX, gridCellSize / 2, gridZ);
        // scene.add(house);

        if ((cell.x + cell.y) % 2 === 0) {
            const houseIdx = houseManager?.addObject(
                cell.x,
                cell.y,
                gridCellSize,
                Math.random() * Math.PI * 2,
            );
        } else {
            const houseIdx = treeManager?.addObject(
                cell.x,
                cell.y,
                gridCellSize,
                Math.random() * Math.PI * 2,
            );
        }
    }

    function toScreenPosition(position3D: THREE.Vector3, camera: THREE.Camera) {
        const vector = position3D.clone().project(camera);
        const canvas = renderer.domElement;

        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (1 - (vector.y * 0.5 + 0.5)) * canvas.clientHeight;

        return { x, y };
    }

    function showMoneyFly(amount: number, position3D: any) {
        const screenPos = toScreenPosition(position3D, camera);
        const div = document.createElement("div");
        div.className = "money-float";
        div.textContent = `-${amount}`;
        div.style.left = `${screenPos.x}px`;
        div.style.top = `${screenPos.y - 50}px`;

        document.body.appendChild(div);

        setTimeout(() => {
            div.remove();
        }, 2000);
    }

    function updateBlocksIfNeeded() {
        const moved = lastCameraPos.distanceTo(camera.position) > gridCellSize;

        // kiểm tra hướng nhìn cũng được
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const rotated = lastCameraDir.angleTo(dir) > 0.05; // ~3 độ

        if (moved || rotated) {
            maybeFetchBlocks(camera);
            lastCameraPos.copy(camera.position);
            lastCameraDir.copy(dir);
        }
    }

    // 🔹 Tính bounds của camera trên mặt phẳng y=0
    function getCameraViewportBounds(camera: THREE.PerspectiveCamera) {
        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse,
        );
        frustum.setFromProjectionMatrix(projScreenMatrix);

        const points: THREE.Vector3[] = [];
        const ndcCorners = [
            new THREE.Vector3(-1, -1, -1),
            new THREE.Vector3(1, -1, -1),
            new THREE.Vector3(1, 1, -1),
            new THREE.Vector3(-1, 1, -1),
            new THREE.Vector3(-1, -1, 1),
            new THREE.Vector3(1, -1, 1),
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(-1, 1, 1),
        ];

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();

        for (const corner of ndcCorners) {
            const worldPos = corner.clone().unproject(camera);
            const dir = worldPos.clone().sub(camera.position).normalize();
            const ray = new THREE.Ray(camera.position, dir);

            if (ray.intersectPlane(plane, target)) {
                if (
                    Number.isFinite(target.x) &&
                    Number.isFinite(target.y) &&
                    Number.isFinite(target.z)
                ) {
                    points.push(target.clone());
                }
            }
        }

        if (points.length === 0) return null;

        const bounds = new THREE.Box3().setFromPoints(points);

        // 🔹 clamp giá trị hợp lý (vd: -10k đến +10k)
        const clamp = 10000;
        return {
            minX: Math.max(-clamp, bounds.min.x),
            maxX: Math.min(clamp, bounds.max.x),
            minZ: Math.max(-clamp, bounds.min.z),
            maxZ: Math.min(clamp, bounds.max.z),
        };
    }

    // 🔹 Convert bounds → cell index
    function getVisibleCells(camera: THREE.PerspectiveCamera) {
        const bounds = getCameraViewportBounds(camera);
        if (!bounds) {
            return null;
        }

        const minCellX = Math.floor(bounds.minX / gridCellSize);
        const maxCellX = Math.floor(bounds.maxX / gridCellSize);
        const minCellY = Math.floor(bounds.minZ / gridCellSize);
        const maxCellY = Math.floor(bounds.maxZ / gridCellSize);

        return { minCellX, maxCellX, minCellY, maxCellY };
    }

    // 🔹 Convert cell → tile index
    function getVisibleTiles(camera: THREE.PerspectiveCamera) {
        const bounds = getVisibleCells(camera);
        if (!bounds) return null;

        const { minCellX, maxCellX, minCellY, maxCellY } = bounds;
        const minTileX = Math.floor(minCellX / tileSize);
        const maxTileX = Math.floor(maxCellX / tileSize);
        const minTileY = Math.floor(minCellY / tileSize);
        const maxTileY = Math.floor(maxCellY / tileSize);

        // 🔹 tránh load quá nhiều
        const MAX_TILES = 200; // giới hạn cứng
        if ((maxTileX - minTileX) * (maxTileY - minTileY) > MAX_TILES) {
            console.warn("Too many tiles in view, clamp skipped");
            return [];
        }

        const tiles: string[] = [];
        for (let tx = minTileX; tx <= maxTileX; tx++) {
            for (let ty = minTileY; ty <= maxTileY; ty++) {
                tiles.push(`${tx},${ty}`);
            }
        }
        return tiles;
    }

    // 🔹 Fetch block khi camera đi sang tile mới
    async function maybeFetchBlocks(camera: THREE.PerspectiveCamera) {
        const now = performance.now();
        if (now - lastFetchTime < 500) return; // debounce 500ms

        const tiles = getVisibleTiles(camera);
        if (!tiles) {
            return;
        }

        for (const tile of tiles) {
            if (!lastTiles.has(tile)) {
                console.log("Fetch tile:", tile);

                const [tx, ty] = tile.split(",").map(Number);
                const list = await blockService.listByTile(tx, ty);
                if (list && list.length > 0) {
                    console.log(">>> found: ", list.length);
                    _.forEach(list, (block: any) => {
                        const found = _.find(blocks, (existBlock: any) => {
                            return existBlock.block_id === block.block_id;
                        });
                        if (!found) {
                            addBlock(block);
                            blocks.push(block);
                        }
                    });
                }

                lastTiles.add(tile);
            }
        }

        lastFetchTime = now;
    }

    function onLoggedIn() {
        loginModalState = false;
        window.location.reload();
    }

    function logout() {
        logoutModalState = false;
        authService.logout();
        window.location.reload();
    }

    let startX = 0,
        startY = 0,
        startTime = 0;
    let dragging = false;

    function handleTouchStart(e: any) {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        dragging = false;
    }

    function handleTouchMove(e: any) {
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            dragging = true;
            startX = touch.clientX;
            startY = touch.clientY;
            move.forward =
                move.backward =
                move.turnLeft =
                move.turnRight =
                    false;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) {
                    move.turnRight = true;
                } else {
                    move.turnLeft = true;
                }
            } else {
                if (dy > 0) {
                    move.backward = true;
                } else {
                    move.forward = true;
                }
            }
        }
    }

    function handleTouchEnd(e: any) {
        const dt = Date.now() - startTime;
        if (!dragging && dt < 300) {
            const touch = e.changedTouches[0];
            handleClick(touch);
        }
        move.turnRight = false;
        move.turnLeft = false;
        move.forward = false;
        move.backward = false;
        dragging = false;
    }
</script>

<div
    bind:this={container}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    class="w-full h-full"
></div>

<!-- user info -->
<div class="fixed top-0 right-0">
    <div
        class="preset-glass-neutral- flex items-center gap-3 w-full flex items-center justify-between bg-white border-b shadow px-4 py-2 z-50"
    >
        <div class="flex flex-col">
            {#if user.isGuest}
                <span class="font-semibold text-gray-800">Guest</span>
            {:else}
                <span class="font-semibold text-gray-800">{user.username}</span>
                <span class="text-sm text-gray-500">Balance: {balance}</span>
            {/if}
        </div>
        {#if user.isGuest}
            <button
                class="px-3 py-1 rounded-none bg-surface-500 text-white text-sm hover:bg-red-600 transition"
                onclick={() => (loginModalState = true)}
            >
                Login
            </button>
        {:else}
            <button
                class="px-3 py-1 rounded-none bg-surface-500 text-white text-sm hover:bg-red-600 transition"
                onclick={() => (logoutModalState = true)}
            >
                Logout
            </button>
        {/if}
    </div>
</div>

<!-- confirm buy block -->
<Modal
    open={confirmBuyModalState}
    onOpenChange={(e) => (confirmBuyModalState = e.open)}
    backdropBase="bg-transparent"
    triggerBase="btn preset-tonal"
    contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <h2 class="text-lg font-semibold text-center">Purchase Confirmation</h2>
        <p class="text-center text-sm text-gray-500">
            This item costs 1,000. Do you want to proceed with the purchase?
        </p>

        <div class="flex justify-center gap-3 pt-2">
            <button
                class="btn preset-tonal-surface"
                onclick={() => (confirmBuyModalState = false)}
            >
                Cancel
            </button>
            <button class="btn preset-filled-primary-500" onclick={buy}>
                Confirm
            </button>
        </div>
    {/snippet}
</Modal>

<!-- login -->
<Modal
    open={loginModalState}
    onOpenChange={(e) => (loginModalState = e.open)}
    triggerBase="btn preset-tonal"
    contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm pointer-events-auto"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <LoginForm {onLoggedIn}></LoginForm>
    {/snippet}
</Modal>

<!-- logout -->
<Modal
    open={logoutModalState}
    onOpenChange={(e) => (logoutModalState = e.open)}
    triggerBase="btn preset-tonal"
    contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <h2 class="text-lg font-semibold text-center">Confirm Logout</h2>
        <p class="text-center text-sm text-gray-500">
            Are you sure you want to log out?
        </p>

        <div class="flex justify-center gap-3 pt-2">
            <button
                class="btn preset-tonal-surface"
                onclick={() => (logoutModalState = false)}
            >
                Cancel
            </button>
            <button class="btn preset-filled-error-500" onclick={logout}>
                Logout
            </button>
        </div>
    {/snippet}
</Modal>

<style>
    :global(body) {
        margin: 0;
        overflow: hidden;
    }

    :global(.money-float) {
        position: absolute;
        color: red;
        font-weight: bold;
        animation: floatUp 2s ease-out forwards;
        pointer-events: none;
    }

    @keyframes floatUp {
        0% {
            opacity: 1;
            transform: translateY(0px);
        }
        100% {
            opacity: 0;
            transform: translateY(-40px);
        }
    }
</style>
