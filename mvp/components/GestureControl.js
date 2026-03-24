import React, { useState, useCallback, useRef, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import GestureInputs from "./GestureInputs";
import styles from "../styles/gestureCollection.module.scss";

function GestureControl({enableCharacteristic, accCharacteristic, userId, isBluetoothConnected, updateGestureCounts, onGestureSaved, isSummaryUpdating,}) {
    const [gestureInfo, setGestureInfo] = useState({ gestureName: "", location: "", isValid: false });
    const [isCollecting, setIsCollecting] = useState(false);
    const [progress, setProgress] = useState(100);
    const [gestureData, setGestureData] = useState([]);
    const [isGestureReady, setIsGestureReady] = useState(false);
    const [autoAdvance, setAutoAdvance] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 🔁 Refs to track latest values in auto-start loop
    const isSavingRef = useRef(isSaving);
    const isSummaryUpdatingRef = useRef(isSummaryUpdating);

    useEffect(() => {
        isSavingRef.current = isSaving;
    }, [isSaving]);

    useEffect(() => {
        isSummaryUpdatingRef.current = isSummaryUpdating;
    }, [isSummaryUpdating]);

    const handleUpdateGesture = useCallback((newGestureInfo) => {
        console.log("Gesture Info Updated:", newGestureInfo);
        setGestureInfo(newGestureInfo);
    }, []);

    const handleStart = () => {
        if (!enableCharacteristic || !accCharacteristic || isSavingRef.current || isSummaryUpdatingRef.current) {
            console.error("Enable/accelerometer characteristic missing or saving/summary update in progress");
            return;
        }

        enableCharacteristic
            .writeValue(new Uint8Array([0x01]))
            .then(() => console.log("Enabling Motion service"))
            .catch((error) => console.error("Error enabling service:", error));

        accCharacteristic
            .startNotifications()
            .then(() => {
                console.log("Notifications requested");
                accCharacteristic.addEventListener("characteristicvaluechanged", handleNotifications);
                setIsCollecting(true);
                setGestureData([]);
                setIsGestureReady(false);
                startProgressBar();
            })
            .catch((error) => console.error("Error starting notifications:", error));
    };

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

        setGestureData((prevData) => [...prevData, { seq, ts, acc: [ax, ay, az], gyro: [gx, gy, gz] }]);
    };

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

        accCharacteristic
            .stopNotifications()
            .then(() => {
                console.log("✅ Notifications stopped");
                accCharacteristic.removeEventListener("characteristicvaluechanged", handleNotifications);
                setProgress(100);
                setIsCollecting(false);
                setTimeout(() => {
                    setGestureData((prevData) => {
                        const isReady = prevData.length > 0;
                        setIsGestureReady(isReady);
                        return prevData;
                    });
                }, 50);
            })
            .catch((error) => console.error("❌ Error stopping notifications:", error));
    };

    const saveGestureToFirestore = async () => {
        if (!userId || !gestureInfo.gestureName || gestureData.length === 0) {
            console.error("❌ Missing required data, cannot save gesture.");
            return;
        }

        setIsSaving(true);

        try {
            await addDoc(collection(db, "gesture_data"), {
                userId,
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
        setIsSaving(false);

        if (autoAdvance) waitAndAutoStart();
    };

    const rejectGesture = () => {
        console.log("Gesture rejected, data cleared.");
        setGestureData([]);
        setIsGestureReady(false);

        if (autoAdvance) waitAndAutoStart();
    };

    const waitAndAutoStart = () => {
        const checkAndStart = () => {
            if (!isSavingRef.current && !isSummaryUpdatingRef.current) {
                handleStart();
            } else {
                setTimeout(checkAndStart, 200);
            }
        };
        setTimeout(checkAndStart, 500);
    };

    return (
        <div className={styles.gestureControlContainer}>
            {(isSaving || isSummaryUpdating) && <p>Saving your Gesture....</p>}

            <GestureInputs userId={userId} onUpdate={handleUpdateGesture} />

            <div className={styles.progressBarContainer}>
                <progress className={styles.progressBar} value={progress} max="100"></progress>
                <div className={styles.referenceBar}></div>
            </div>

            <div className={styles.buttonContainer}>
                <button
                    onClick={handleStart}
                    disabled={
                        isCollecting ||
                        isGestureReady ||
                        !gestureInfo.isValid ||
                        !isBluetoothConnected ||
                        isSaving ||
                        isSummaryUpdating
                    }
                    className={`${styles.button} ${
                        isCollecting ||
                        isGestureReady ||
                        !gestureInfo.isValid ||
                        !isBluetoothConnected ||
                        isSaving ||
                        isSummaryUpdating
                            ? styles.disabled
                            : ""
                    }`}
                >
                    Start
                </button>
            </div>

            <div className={styles.checkboxContainer}>
                <input
                    type="checkbox"
                    id="autoAdvance"
                    checked={autoAdvance}
                    onChange={() => setAutoAdvance(!autoAdvance)}
                />
                <label htmlFor="autoAdvance">Auto-Advance</label>
            </div>

            <div className={styles.buttonContainer}>
                <button
                    onClick={saveGestureToFirestore}
                    disabled={!isGestureReady || isSaving}
                    className={`${styles.button} ${!isGestureReady || isSaving ? styles.disabled : ""}`}
                >
                    Accept Gesture
                </button>
                <button
                    onClick={rejectGesture}
                    disabled={!isGestureReady || isSaving}
                    className={`${styles.button} ${!isGestureReady || isSaving ? styles.disabled : ""}`}
                >
                    Reject Gesture
                </button>
            </div>
        </div>
    );
}

export default GestureControl;
