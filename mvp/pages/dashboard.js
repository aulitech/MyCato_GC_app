import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Container, IconButton, Stack, Typography, Grid, Button, Alert } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NavBar from "../components/navbar";
import { useAuth } from "../firebase/auth";
import { db } from '../firebase/firebase'; 
import { collection, query, where, getDocs } from 'firebase/firestore';
import GestureVisualizer from "../components/GestureVisualizer";
import styles from "../styles/dashboard.module.scss";

export default function Dashboard() {
    const { authUser, isLoading } = useAuth();
    const router = useRouter();
    const [gestures, setGestures] = useState([]);  
    const [loadingGestures, setLoadingGestures] = useState(true);
    const [gestureDataMap, setGestureDataMap] = useState({});
    const [showMessage, setShowMessage] = useState(false); // ✅ State for showing message

    useEffect(() => {
        if (authUser) {
            fetchGestures();
        }
    }, [authUser]); 

    const fetchGestures = async () => {
        if (authUser) {
            try {
                const q = query(collection(db, "gesture_data"), where("userId", "==", authUser.uid));
                const querySnapshot = await getDocs(q);

                let gestureSet = new Set();
                querySnapshot.forEach((doc) => {
                    const gestureName = doc.data().gestureName;
                    gestureSet.add(gestureName);
                });

                const gestureArray = Array.from(gestureSet);
                setGestures(gestureArray);
                console.log("✅ Gestures Array:", gestureArray);

                if (gestureArray.length > 0) {
                    fetchAllGestureData(gestureArray);  
                }
            } catch (error) {
                console.error("❌ Error fetching gestures:", error);
            } finally {
                setLoadingGestures(false);
            }
        }
    };

    const fetchAllGestureData = async (gestureArray) => {
        if (!authUser) return;
        let dataMap = {};  

        for (let gestureName of gestureArray) {
            try {
                console.log(`🔍 Fetching gesture data for: ${gestureName}`);

                const q = query(
                    collection(db, "gesture_data"),
                    where("userId", "==", authUser.uid),
                    where("gestureName", "==", gestureName)
                );
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    let validGesture = null;
                    for (let doc of querySnapshot.docs) {
                        const imuData = doc.data().data;
                        if (imuData && imuData.length > 100) { 
                            validGesture = imuData;
                            break; 
                        }
                    }

                    if (validGesture) {
                        dataMap[gestureName] = validGesture;  
                    } else {
                        console.warn(`⚠️ No valid gesture with >100 samples found for: ${gestureName}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Error fetching gesture data for ${gestureName}:`, error);
            }
        }

        setGestureDataMap(dataMap);  
        console.log("✅ Filtered Gesture Data Map:", dataMap);
    };

    // ✅ Function to show message when button is clicked
    const handleTrainModel = () => {
        setShowMessage(true);
        console.log("📡 Sending gestures to Auli.Tech for training...");
    };

    return (
        (!authUser || loadingGestures) ? (
            <Typography>Loading...</Typography>
        ) : (
            <div>
                <Head>
                    <title>Cato Gesture Collection</title>
                </Head>

                <Container>
                    <Stack direction="row" sx={{ paddingTop: "1.5em" }}>
                        <Typography variant="h4" sx={{ lineHeight: 2, paddingRight: "0.5em" }}>
                            ADD GESTURE
                        </Typography>
                        <IconButton aria-label="add" color="secondary" onClick={() => router.push('/gesture-collection')} className={styles.addButton}>
                            <AddIcon />
                        </IconButton>
                    </Stack>

                    <Typography variant="h5" sx={{ marginTop: "1.5em", fontWeight: "bold" }}>
                        Your Gestures:
                    </Typography>

                    {/* ✅ Gesture Visualizations */}
                    <Grid container spacing={4} sx={{ marginTop: "20px" }}>
                        {Object.keys(gestureDataMap).map((gestureName, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}> 
                                <Typography variant="h5" sx={{ fontWeight: "bold", textAlign: "center", marginBottom: "10px" }}>
                                    {gestureName}
                                </Typography>
                                <GestureVisualizer imuData={gestureDataMap[gestureName]} />
                            </Grid>
                        ))}
                    </Grid>

                    {/* ✅ "Train Personalized Model" Button */}
                    <div style={{ textAlign: "center", marginTop: "2rem" }}>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleTrainModel} 
                            sx={{ fontSize: "1.2rem", padding: "12px 24px", marginTop: "20px" }}
                        >
                            Train Personalized Model
                        </Button>

                        {/* ✅ Success Message Appears When Button is Clicked */}
                        {showMessage && (
                            <Alert severity="success" sx={{ marginTop: "15px", fontSize: "1.1rem" }}>
                                Your personalized gesture model is training!
                            </Alert>
                        )}
                    </div>
                </Container>
            </div>
        )
    );
}
