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
    const [enableCharacteristic, setEnableCharacteristic] = useState(null); // ✅ Enable characteristic
    const [accelerometerCharacteristic, setAccelerometerCharacteristic] = useState(null); // ✅ Accelerometer characteristic
    const [userId, setUserId] = useState(null); // ✅ Store user ID from Firebase Auth
    const [isBluetoothConnected, setBluetoothConnected] = useState(false); // ✅ Track Bluetooth status
    const { authUser, isLoading } = useAuth(); // ✅ Get authUser
    const [gestureCounts, setGestureCounts] = useState({});
    const [refreshGestureSummary, setRefreshGestureSummary] = useState(false); // ✅ Trigger GestureSummary update
    const [isSummaryUpdating, setIsSummaryUpdating] = useState(false);


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
 

    // ✅ Callback for setting Bluetooth characteristics
    const handleCharacteristicsReady = (enableChar, accChar) => {
        setEnableCharacteristic(enableChar);
        setAccelerometerCharacteristic(accChar);
        setBluetoothConnected(!!enableChar && !!accChar); // ✅ Update Bluetooth connection state
    };

    return (
        <div className={styles.pageContent}>
            <div className={styles.contentContainer}>
                {/* Left Side: Inputs and Controls */}
                <div className={styles.leftContainer}>
                    <h1 className={styles.gestureTitle}>Cato Gesture Collection</h1>

                    <BluetoothConnector //passing props to child component: BluetoothConnector
                        onCharacteristicsReady={handleCharacteristicsReady} 
                        setBluetoothConnected={setBluetoothConnected}
                    />

                    <GestureControl //passing props to child component: GestureControl
                        enableCharacteristic={enableCharacteristic}
                        accCharacteristic={accelerometerCharacteristic}
                        userId={userId}
                        isBluetoothConnected={isBluetoothConnected}
                        updateGestureCounts={updateGestureCounts}
                        onGestureSaved={handleGestureSaved}
                        isSummaryUpdating={isSummaryUpdating}
                    />
                </div>

                {/* Right Side: Gesture Summary */}
                <div className={styles.rightContainer}>
                    {userId && <GestureSummary userId={userId} refreshTrigger={refreshGestureSummary} setIsSummaryUpdating={setIsSummaryUpdating}/>} 
                </div>
            </div>
        </div>
    );

}

export default GestureCollection;
