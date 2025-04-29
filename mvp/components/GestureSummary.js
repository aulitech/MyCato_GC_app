import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import styles from "../styles/gestureCollection.module.scss";

function GestureSummary({ userId, refreshTrigger}) {
    const [gestureCounts, setGestureCounts] = useState({});

    useEffect(() => {
        if (!userId) return;

        const fetchGestureCounts = async () => {
            try {
                console.log("Fetching gesture counts for user:", userId);
                const q = query(collection(db, "gesture_data"), where("userId", "==", userId));
                const querySnapshot = await getDocs(q);

                let counts = {};
                querySnapshot.forEach((doc) => {
                    const gestureName = doc.data().gestureName;
                    counts[gestureName] = (counts[gestureName] || 0) + 1;
                });

                setGestureCounts(counts);
                console.log("✅ Gesture counts updated:", counts);
            } catch (error) {
                console.error("❌ Error fetching gesture counts:", error);
            }
        };

        fetchGestureCounts();
    }, [userId, refreshTrigger]);

    return (
        <div className={styles.gestureSummaryContainer}>
            <h3>Gesture Counts</h3>
            <ul>
                {Object.entries(gestureCounts).map(([gesture, count]) => (
                    <li key={gesture}>{gesture}: {count}</li>
                ))}
            </ul>
        </div>
    );
}

export default GestureSummary;
