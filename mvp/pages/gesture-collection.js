import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import GestureInputs from "../components/GestureInputs";
import BluetoothConnector from "../components/BluetoothConnector";
import GestureControl from "../components/GestureControl";
import NavBar from "../components/navbar";
import GestureSummary from "../components/GestureSummary";
import styles from "../styles/gestureCollection.module.scss"; // ✅ Import SCSS module
import { useAuth } from "../firebase/auth";

function GestureCollection() {
    const [gestureInputs, setGestureInputs] = useState({}); // ✅ State for input fields
    const [enableCharacteristic, setEnableCharacteristic] = useState(null); // ✅ Enable characteristic
    const [accelerometerCharacteristic, setAccelerometerCharacteristic] = useState(null); // ✅ Accelerometer characteristic
    const [userId, setUserId] = useState(null); // ✅ Store user ID from Firebase Auth
    const [gestureCount, setGestureCount] = useState(0); // ✅ Local Gesture Count
    const [isBluetoothConnected, setBluetoothConnected] = useState(false); // ✅ Track Bluetooth status
    const { authUser, isLoading } = useAuth(); // ✅ Get authUser
    const [gestureCounts, setGestureCounts] = useState({});
    const [gestureUpdated, setGestureUpdated] = useState(false); // ✅ Track when a gesture is saved
    const [refreshGestureSummary, setRefreshGestureSummary] = useState(false); // ✅ Trigger GestureSummary update


    const updateGestureCounts = (newGesture) => {
        setGestureCounts((prevCounts) => ({
            ...prevCounts,
            [newGesture]: (prevCounts[newGesture] || 0) + 1
        }));
    };

    // ✅ Function to trigger GestureSummary update
    const handleGestureSaved = () => {
        console.log("🔄 Gesture saved! Refreshing GestureSummary...");
        setRefreshGestureSummary((prev) => !prev); // ✅ Toggle state to force re-fetch
    };  
    

    // ✅ Fetch authenticated user on mount
    useEffect(() => {
        if (!isLoading) {
            if (authUser) {
                setUserId(authUser.uid);
                console.log("✅ User ID set dynamically:", authUser.uid);
            } else {
                console.warn("❌ No user is logged in.");
            }
        }
    }, [authUser, isLoading]); // ✅ Reacts when authUser updates

    if (isLoading) return <p>Loading...</p>; // ✅ Prevents running before auth is ready
 

    // ✅ Handle updates from GestureInputs
    const handleInputUpdate = (data) => {
        setGestureInputs(data);
        console.log("Input Data:", data);
    };

    // ✅ Callback for setting Bluetooth characteristics
    const handleCharacteristicsReady = (enableChar, accChar) => {
        setEnableCharacteristic(enableChar);
        setAccelerometerCharacteristic(accChar);
        setBluetoothConnected(!!enableChar && !!accChar); // ✅ Update Bluetooth connection state
    };

    return (
        <div className={styles.gestureContainer}>
            <h1 className={styles.gestureTitle}>Cato Gesture Collection</h1>
    
            {/* ✅ Bluetooth Connector */}
            <BluetoothConnector 
                onCharacteristicsReady={handleCharacteristicsReady}
                setBluetoothConnected={setBluetoothConnected}
            />
    
            {/* ✅ Gesture Control Section */}
            <GestureControl
                enableCharacteristic={enableCharacteristic}
                accCharacteristic={accelerometerCharacteristic}
                userId={userId}
                isBluetoothConnected={isBluetoothConnected}
                updateGestureCounts={updateGestureCounts}
                onGestureSaved={handleGestureSaved}
            />
    
             {/* ✅ Add Gesture Summary Below Gesture Control */}
             {userId && <GestureSummary userId={userId} refreshTrigger={refreshGestureSummary}/>}

        </div>
    );
}

export default GestureCollection;
