import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../firebase/auth'; 
import styles from '../styles/gestureCollection.module.scss';
import { db } from '../firebase/firebase'; 

function GestureInputs({ onUpdate }) {
    const { authUser } = useAuth();
    const userId = authUser?.uid;
    const [gestureName, setGestureName] = useState('');
    const [location, setLocation] = useState('Right Temple'); 
    const [existingGestures, setExistingGestures] = useState([]); 
    const [isNewGesture, setIsNewGesture] = useState(false); 

    // ✅ Fetch user's existing gestures
    useEffect(() => {
        if (!userId) return;

        const fetchGestures = async () => {
            try {
                console.log("Fetching gestures for user:", userId);
                const gesturesRef = collection(db, 'gesture_data');
                const q = query(gesturesRef, where('userId', '==', userId));
                const querySnapshot = await getDocs(q);
                const gestures = new Set();
                
                querySnapshot.forEach((doc) => {
                    const name = doc.data()?.gestureName;
                    if (name) gestures.add(name);
                });

                console.log("Fetched Gestures:", [...gestures]);
                setExistingGestures([...gestures]);
            } catch (error) {
                console.error('Error fetching gestures:', error);
            }
        };

        fetchGestures();
    }, [userId]);

    // ✅ Handle Gesture Name Change
    const handleGestureChange = (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue === "new_gesture") {
            setIsNewGesture(true);
            setGestureName('');
        } else {
            setIsNewGesture(false);
            setGestureName(selectedValue);
        }
    };

    // ✅ Handle Custom Gesture Name Input
    const handleCustomGestureInput = (e) => {
        setGestureName(e.target.value);
    };

    // ✅ Ensure `onUpdate` sends correct data
    useEffect(() => {
        const isValid = gestureName.trim() !== '';
        onUpdate({ gestureName, location, isValid });
    }, [gestureName, location, onUpdate]);

    return (
        <div className={styles.inputContainer}>
            <div className={styles.inputFields}>
                
                {/* ✅ Gesture Name Selection */}
                <div className={styles.inputGroup}>
                    <label htmlFor="gestureName">Gesture Name</label>
                    <select
                        id="gestureDropdown"
                        value={isNewGesture ? "new_gesture" : gestureName}
                        onChange={handleGestureChange}
                    >
                        <option value="">Select gesture</option>
                        {existingGestures.map((name, index) => (
                            <option key={index} value={name}>
                                {name}
                            </option>
                        ))}
                        <option value="new_gesture">New Gesture</option> 
                    </select>

                    {/* ✅ Show text input if "New Gesture" is selected */}
                    {isNewGesture && (
                        <input
                            type="text"
                            id="gestureNameInput"
                            placeholder="Enter new gesture name"
                            value={gestureName}
                            onChange={handleCustomGestureInput}
                        />
                    )}
                </div>

                {/* ✅ Cato Location Selection */}
                <div className={styles.inputGroup}>
                    <label htmlFor="location">Cato Location</label>
                    <select
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    >
                        <option value="Right Ear Clip">Right Ear Clip</option>
                        <option value="Left Ear Slip">Left Ear Clip</option>
                        <option value="Right Glasses">Right Glasses</option>
                        <option value="Left Glasses">Left Glasses</option>
                        <option value="Top of Right Wrist">Top of Right Wrist</option>
                        <option value="Top of Left Wrist">Top of Left Wrist</option>
                        <option value="Outside Right Heel">Outside Right Heel</option>
                        <option value="Outside Left Heel">Outside Left Heel</option>
                        <option value="Behind Right Heel">Behind Right Heel</option>
                        <option value="Behind Left Heel">Behind Left Heel</option>
                        <option value="Above Right Foot">Above Right Foot</option>
                        <option value="Above Left Foot">Above Left Foot</option>
                        <option value="Above Right Knee">Above Right Knee</option>
                        <option value="Above Left Knee">Above Left Knee</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

export default GestureInputs;
