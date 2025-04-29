import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

const GestureVisualizer = ({ imuData }) => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!imuData || imuData.length === 0) return;

        // ✅ Set up scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xFAFAFA); // ✅ Set background to white

        // ✅ Adjust camera position for zoom-out effectcd mvp
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.set(0, 0, 20); // ✅ Increased from 15 → 20 for slight zoom out

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(400, 400);

        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        // ✅ Load IMU device model
        const loader = new STLLoader();
        const material = new THREE.MeshNormalMaterial();
        let imuDevice;

        loader.load("/Cato solid model v1.stl", (geometry) => {
            imuDevice = new THREE.Mesh(geometry, material);
            imuDevice.scale.set(0.5, 0.5, 0.5);
            imuDevice.position.set(0, 0, 0);

            // ✅ Rotate 90 degrees (π/2 radians) along the desired axis
            // imuDevice.rotation.x = Math.PI / 2; // Rotate around X-axis
            // imuDevice.rotation.y = Math.PI / 2; // Rotate around Y-axis
            imuDevice.rotation.z = -(Math.PI / 2); // Rotate around Z-axis

            scene.add(imuDevice);
        });

        // ✅ Lighting
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);

        // ✅ Store initial position and rotation
        const initialPosition = new THREE.Vector3(0, 0, 0);
        const initialRotation = new THREE.Euler(0, 0, -Math.PI / 2); // ✅ Keep initial 90-degree rotation on Z-axis

        // ✅ Loop animation with reset
        let frame = 0;
        function animate() {
            if (imuDevice) {
                if (frame >= imuData.length) {
                    // ✅ Reset to original position & maintain initial rotation
                    imuDevice.position.copy(initialPosition);
                    imuDevice.rotation.copy(initialRotation); // ✅ Preserve initial rotation
        
                    frame = 0; // ✅ Restart loop
                }
        
                const { acc, gyro } = imuData[frame];
        
                // ✅ Apply IMU motion updates on top of the preserved rotation
                imuDevice.rotation.x += THREE.MathUtils.degToRad(gyro[2] / 100);
                imuDevice.rotation.y += THREE.MathUtils.degToRad(gyro[0] / -100);
                imuDevice.rotation.z += THREE.MathUtils.degToRad(gyro[1] / -100);
        
                imuDevice.position.x += acc[1] / 500;
                imuDevice.position.y += (acc[0] / 500); // ✅ Correct for gravity
                imuDevice.position.z += acc[2] / 500;
        
                frame++;
            }
        
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }

        animate();

        return () => {
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, [imuData]);

    return <div ref={mountRef} />;
};

export default GestureVisualizer;
