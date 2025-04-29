import React, { useState, useCallback } from "react";
import { useAuth } from "../firebase/auth"; // ✅ Import authentication context
import { collection, addDoc } from "firebase/firestore"; // ✅ Import Firestore methods
import { db} from "../firebase/firebase";
import GestureInputs from "./GestureInputs"; // ✅ Import GestureInputs component
import styles from "../styles/gestureCollection.module.scss"; // ✅ Import styles

function GestureControl({ enableCharacteristic, accCharacteristic, userId, isBluetoothConnected, updateGestureCounts, onGestureSaved}) {
    const [gestureInfo, setGestureInfo] = useState({ gestureName: "", location: "", isValid: false });
    const [isCollecting, setIsCollecting] = useState(false);
    const [progress, setProgress] = useState(100);
    const [gestureData, setGestureData] = useState([]);
    const [isGestureReady, setIsGestureReady] = useState(false);
    const [autoAdvance, setAutoAdvance] = useState(false); // ✅ New state for auto-advance

    // ✅ Memoize onUpdate to prevent unnecessary updates
    const handleUpdateGesture = useCallback((newGestureInfo) => {
        console.log("Gesture Info Updated:", newGestureInfo);
        setGestureInfo(newGestureInfo);
    }, []);

    // ✅ Start Gesture Collection
    const handleStart = () => {
        if (!enableCharacteristic || !accCharacteristic) {
            console.error("Enable or accelerometer characteristic is missing");
            return;
        }

        enableCharacteristic.writeValue(new Uint8Array([0x01]))
            .then(() => console.log("Enabling Motion service"))
            .catch((error) => console.error("Error enabling service:", error));

        accCharacteristic.startNotifications()
            .then(() => {
                console.log("Notifications requested");
                accCharacteristic.addEventListener("characteristicvaluechanged", handleNotifications);
                setIsCollecting(true);
                setGestureData([]); // Reset data collection
                setIsGestureReady(false); // Disable Accept/Reject buttons
                startProgressBar();
            })
            .catch((error) => console.error("Error starting notifications:", error));
    };

    // ✅ Handle Incoming IMU Data
    const handleNotifications = (event) => {
        let value = event.target.value;
        const seq = value.getUint16(0, false);
        const ts = value.getUint16(2, false);
        const ax = value.getInt16(4, false) / 10;
        const ay = value.getInt16(6, false) / 10;
        const az = value.getInt16(8, false) / 10;
        const gx = value.getInt16(10, false) / 10;
        const gy = value.getInt16(12, false) / 10;
        const gz = value.getInt16(14, false) / 10;

        const dataRow = { seq, ts, acc: [ax, ay, az], gyro: [gx, gy, gz] };

        console.log("📡 Data received:", dataRow);

        setGestureData(prevData => {
            const newData = [...prevData, dataRow];
            console.log("📊 Updated Gesture Data Length:", newData.length);
            return newData;
        });
    };

    // ✅ Start Progress Bar
    const startProgressBar = () => {
        let progressValue = 100;
        const interval = setInterval(() => {
            progressValue -= 1;
            setProgress(progressValue);

            if (progressValue <= 0) {
                clearInterval(interval);
                stopCollection();
            }
        }, 20);
    };

    const stopCollection = () => {
        if (!accCharacteristic) return;
    
        accCharacteristic.stopNotifications()
            .then(() => {
                console.log("✅ Notifications stopped");
                accCharacteristic.removeEventListener("characteristicvaluechanged", handleNotifications);
                setProgress(100);
                setIsCollecting(false);
    
                // ✅ Debugging: Print gesture data using a callback
                setTimeout(() => {
                    setGestureData(prevData => {
                        console.log("📊 Gesture Data Length at Stop:", prevData.length);
                        const isReady = prevData.length > 0;
                        console.log("⚡ Setting isGestureReady:", isReady);
                        setIsGestureReady(isReady);
                        return prevData;
                    });
                }, 50);
            })
            .catch((error) => console.error("❌ Error stopping notifications:", error));
    };
    

    const saveGestureToFirestore = async () => {
        console.log("Saving gesture with the following data:");
        console.log("userId:", userId);
        console.log("gestureName:", gestureInfo.gestureName);
        console.log("gestureData Length:", gestureData.length);
    
        if (!userId || !gestureInfo.gestureName || gestureData.length === 0) {
            console.error("❌ Missing required data, cannot save gesture.");
            return;
        }
    
        try {
            await addDoc(collection(db, "gesture_data"), {
                userId: userId,
                gestureName: gestureInfo.gestureName,
                location: gestureInfo.location,
                timestamp: new Date().toISOString(),
                data: gestureData,
            });
            console.log("✅ Gesture data saved successfully!");
            updateGestureCounts(gestureInfo.gestureName);
            onGestureSaved();
        } catch (error) {
            console.error("🔥 Error saving gesture data:", error);
        }
    
        setIsGestureReady(false);
        setGestureData([]);
    
        if (autoAdvance) {
            setTimeout(() => handleStart(), 500);
        }
    };
    


    // ✅ Reject Gesture - Simply clear the collected data
    const rejectGesture = () => {
        console.log("Gesture rejected, data cleared.");
        setGestureData([]);
        setIsGestureReady(false);

        // ✅ If auto-advance is enabled, immediately start next gesture
        if (autoAdvance) {
            setTimeout(() => handleStart(), 500);
        }
    };



    return (
        <div className={styles.gestureControlContainer}>

            {/* ✅ Gesture Inputs */}
            <GestureInputs userId={userId} onUpdate={handleUpdateGesture} />

            {/* ✅ Progress Bar */}
            <div className={styles.progressBarContainer}>
                <progress className={styles.progressBar} value={progress} max="100"></progress>
                <div className={styles.referenceBar}></div> {/* ✅ Thin reference bar below */}
            </div>

            {/* ✅ Button Container */}
            <div className={styles.buttonContainer}>
                <button 
                    onClick={handleStart} 
                    disabled={isCollecting || isGestureReady || !gestureInfo.isValid || !isBluetoothConnected} 
                    className={`${styles.button} ${isCollecting || isGestureReady || !gestureInfo.isValid || !isBluetoothConnected ? styles.disabled : ""}`}
                >
                    Start
                </button>
            </div>

            {/* ✅ Auto-Advance Checkbox */}
            <div className={styles.checkboxContainer}>
                <input
                    type="checkbox"
                    id="autoAdvance"
                    checked={autoAdvance}
                    onChange={() => setAutoAdvance(!autoAdvance)}
                />
                <label htmlFor="autoAdvance">Auto-Advance</label>
            </div>

            {/* ✅ Accept/Reject Gesture Buttons */}
            <div className={styles.buttonContainer}>
                <button 
                    onClick={saveGestureToFirestore} 
                    disabled={!isGestureReady} 
                    className={`${styles.button} ${!isGestureReady ? styles.disabled : ""}`}
                >
                    Accept Gesture
                </button>

                <button 
                    onClick={rejectGesture} 
                    disabled={!isGestureReady} 
                    className={`${styles.button} ${!isGestureReady ? styles.disabled : ""}`}
                >
                    Reject Gesture
                </button>
            </div>
        </div>
    );
}

export default GestureControl;
