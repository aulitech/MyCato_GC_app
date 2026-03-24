import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
    Container, IconButton, Stack, Typography, Grid, Button,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    TextField, CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "../firebase/auth";
import { db } from "../firebase/firebase";
import {
    collection, query, where, getDocs, deleteDoc, doc,
    addDoc, serverTimestamp,
} from "firebase/firestore";
import GestureVisualizer from "../components/GestureVisualizer";
import GestureTemplateChart from "../components/GestureTemplateChart";
import styles from "../styles/dashboard.module.scss";

// ── Preprocessing constants (ported from Preprocessing_GC_App_Cross_Correlation.ipynb) ──
const MOTION_THS = 20;  // degrees/s — threshold to detect start of motion
const IDLE_THS   = 15;  // degrees/s — threshold to detect end of motion
const THRASH_WIN = 12;  // samples — ignore premature motion at start
const IDLE_MAX   = 60;  // samples — consecutive idle samples that signal end of gesture
const WIN        = 100; // samples — fixed window size for each preprocessed gesture

function gyroMag(sample) {
    const [gx, gy, gz] = sample.gyro;
    return Math.sqrt(gx * gx + gy * gy + gz * gz);
}

/**
 * Trim a raw recording to a fixed 100-sample window centred on the gesture peak.
 * Returns null if the window falls out of bounds.
 */
function preprocessRecording(samples) {
    let motionStart = 0;

    // Let premature motion pass (thrash window)
    let idleCount = THRASH_WIN / 2;
    while (idleCount < THRASH_WIN && motionStart < samples.length) {
        if (gyroMag(samples[motionStart]) > IDLE_THS) idleCount = 0;
        idleCount++;
        motionStart++;
    }

    // Detect motion start
    while (motionStart < samples.length) {
        if (gyroMag(samples[motionStart]) > MOTION_THS) break;
        motionStart++;
    }

    // Detect motion end
    let motionEnd = motionStart;
    let trailingIdle = 0;
    while (motionEnd < samples.length && trailingIdle < IDLE_MAX) {
        if (gyroMag(samples[motionEnd]) < IDLE_THS) trailingIdle++;
        else trailingIdle = 0;
        motionEnd++;
    }
    motionEnd -= trailingIdle;
    motionEnd = Math.min(motionEnd, samples.length);

    // Centre window
    const center   = Math.floor((motionStart + motionEnd) / 2);
    const winStart = center - Math.floor(WIN / 2);
    const winEnd   = winStart + WIN;

    if (winStart < 0 || winEnd > samples.length) return null;
    return samples.slice(winStart, winEnd);
}

/**
 * Average a set of preprocessed 100-sample recordings into a single template.
 * Returns { acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z } each being 100 values.
 */
function buildTemplate(recordings) {
    const cols = ["acc_x", "acc_y", "acc_z", "gyro_x", "gyro_y", "gyro_z"];
    const sums = Object.fromEntries(cols.map((c) => [c, new Array(WIN).fill(0)]));
    let validCount = 0;

    for (const rec of recordings) {
        if (!rec || rec.length !== WIN) continue;
        for (let i = 0; i < WIN; i++) {
            sums.acc_x[i]  += rec[i].acc[0];
            sums.acc_y[i]  += rec[i].acc[1];
            sums.acc_z[i]  += rec[i].acc[2];
            sums.gyro_x[i] += rec[i].gyro[0];
            sums.gyro_y[i] += rec[i].gyro[1];
            sums.gyro_z[i] += rec[i].gyro[2];
        }
        validCount++;
    }

    if (validCount === 0) return null;

    return Object.fromEntries(
        cols.map((c) => [c, sums[c].map((v) => Math.round((v / validCount) * 1000) / 1000)])
    );
}

// ────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const { authUser } = useAuth();
    const router = useRouter();

    const [loadingGestures,   setLoadingGestures]   = useState(true);
    const [gestureDataMap,    setGestureDataMap]     = useState({});
    const [gestureModels,     setGestureModels]      = useState([]);

    const [isGenerating,      setIsGenerating]       = useState(false);

    // Multi-select: a Set of selected gesture names
    const [selectedGestures,  setSelectedGestures]  = useState(new Set());

    // Delete dialog
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // Generate model dialog
    const [generateModelOpen, setGenerateModelOpen] = useState(false);
    const [modelNameInput,    setModelNameInput]    = useState("");

    useEffect(() => {
        if (authUser) {
            fetchGestures();
            fetchGestureModels();
        }
    }, [authUser]);

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchGestures = async () => {
        try {
            const q = query(collection(db, "gesture_data"), where("userId", "==", authUser.uid));
            const querySnapshot = await getDocs(q);

            const gestureSet = new Set();
            querySnapshot.forEach((d) => gestureSet.add(d.data().gestureName));

            const gestureArray = Array.from(gestureSet);
            if (gestureArray.length > 0) fetchAllGestureData(gestureArray);
        } catch (error) {
            console.error("❌ Error fetching gestures:", error);
        } finally {
            setLoadingGestures(false);
        }
    };

    const fetchAllGestureData = async (gestureArray) => {
        const dataMap = {};
        for (const gestureName of gestureArray) {
            try {
                const q = query(
                    collection(db, "gesture_data"),
                    where("userId", "==", authUser.uid),
                    where("gestureName", "==", gestureName)
                );
                const snapshot = await getDocs(q);
                for (const d of snapshot.docs) {
                    const imuData = d.data().data;
                    if (imuData && imuData.length > 100) {
                        dataMap[gestureName] = imuData;
                        break;
                    }
                }
            } catch (error) {
                console.error(`❌ Error fetching gesture data for ${gestureName}:`, error);
            }
        }
        setGestureDataMap(dataMap);
    };

    const fetchGestureModels = async () => {
        try {
            const q = query(collection(db, "gesture_models"), where("userId", "==", authUser.uid));
            const snapshot = await getDocs(q);
            setGestureModels(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("❌ Error fetching gesture models:", error);
        }
    };

    // ── Selection ────────────────────────────────────────────────────────────

    const toggleGestureSelection = (gestureName) => {
        setSelectedGestures((prev) => {
            const next = new Set(prev);
            if (next.has(gestureName)) next.delete(gestureName);
            else next.add(gestureName);
            return next;
        });
    };

    // ── Delete ───────────────────────────────────────────────────────────────

    const handleDeleteConfirmed = async () => {
        setConfirmDeleteOpen(false);
        const toDelete = new Set(selectedGestures);

        for (const gestureName of toDelete) {
            try {
                const q = query(
                    collection(db, "gesture_data"),
                    where("userId", "==", authUser.uid),
                    where("gestureName", "==", gestureName)
                );
                const snapshot = await getDocs(q);
                await Promise.all(snapshot.docs.map((d) => deleteDoc(doc(db, "gesture_data", d.id))));
            } catch (error) {
                console.error(`❌ Error deleting ${gestureName}:`, error);
            }
        }

        setGestureDataMap((prev) => {
            const updated = { ...prev };
            toDelete.forEach((g) => delete updated[g]);
            return updated;
        });
        setSelectedGestures(new Set());
    };

    // ── Download TSV ─────────────────────────────────────────────────────────

    const downloadModelTsv = (model) => {
        const cols = ["acc_x", "acc_y", "acc_z", "gyro_x", "gyro_y", "gyro_z"];
        const header = ["gesture_name", "t", ...cols].join("\t");

        const rows = [];
        for (const [gestureName, template] of Object.entries(model.templates || {})) {
            const n = template[cols[0]]?.length ?? 0;
            for (let t = 0; t < n; t++) {
                const values = cols.map((c) => template[c][t] ?? "");
                rows.push([gestureName, t, ...values].join("\t"));
            }
        }

        const blob = new Blob([[header, ...rows].join("\n")], { type: "text/tab-separated-values" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${model.modelName}.tsv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Generate Model ───────────────────────────────────────────────────────

    const handleGenerateModel = async () => {
        const name = modelNameInput.trim();
        if (!name) return;
        setGenerateModelOpen(false);
        setIsGenerating(true);

        try {
            const templates = {};

            for (const gestureName of selectedGestures) {
                const q = query(
                    collection(db, "gesture_data"),
                    where("userId", "==", authUser.uid),
                    where("gestureName", "==", gestureName)
                );
                const snapshot = await getDocs(q);

                const recordings = snapshot.docs
                    .map((d) => d.data().data)
                    .filter(Boolean)
                    .map(preprocessRecording)
                    .filter(Boolean);

                console.log(`📊 ${gestureName}: ${snapshot.docs.length} raw recordings → ${recordings.length} valid windows`);

                const template = buildTemplate(recordings);
                if (template) templates[gestureName] = template;
                else console.warn(`⚠️ Could not build template for ${gestureName} — no valid windows`);
            }

            const modelPayload = {
                userId:    authUser.uid,
                modelName: name,
                templates,
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, "gesture_models"), modelPayload);
            setGestureModels((prev) => [...prev, { id: docRef.id, ...modelPayload }]);
            setSelectedGestures(new Set());
            setModelNameInput("");
        } catch (error) {
            console.error("❌ Error generating gesture model:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    const selectedArray = Array.from(selectedGestures);

    return (
        (!authUser || loadingGestures) ? (
            <Typography>Loading...</Typography>
        ) : (
            <div>
                <Head><title>Cato Gesture Collection</title></Head>

                <Container>
                    {/* Header */}
                    <Stack direction="row" sx={{ paddingTop: "1.5em" }}>
                        <Typography variant="h4" sx={{ lineHeight: 2, paddingRight: "0.5em" }}>
                            ADD GESTURE
                        </Typography>
                        <IconButton
                            aria-label="add"
                            color="secondary"
                            onClick={() => router.push("/gesture-collection")}
                            className={styles.addButton}
                        >
                            <AddIcon />
                        </IconButton>
                    </Stack>

                    {/* ── Gesture cards ── */}
                    <Typography variant="h5" sx={{ marginTop: "1.5em", fontWeight: "bold" }}>
                        Your Gestures:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ marginTop: "0.25em" }}>
                        Click a gesture to select it. Selected gestures can be deleted or used to generate a model.
                    </Typography>

                    <Grid container spacing={4} sx={{ marginTop: "10px" }}>
                        {Object.keys(gestureDataMap).map((gestureName, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <div
                                    onClick={() => toggleGestureSelection(gestureName)}
                                    style={{
                                        cursor: "pointer",
                                        border: selectedGestures.has(gestureName)
                                            ? "3px solid #1976d2"
                                            : "3px solid transparent",
                                        borderRadius: "8px",
                                        padding: "8px",
                                    }}
                                >
                                    <Typography variant="h5" sx={{ fontWeight: "bold", textAlign: "center", marginBottom: "10px" }}>
                                        {gestureName}
                                    </Typography>
                                    <GestureVisualizer imuData={gestureDataMap[gestureName]} />
                                </div>
                            </Grid>
                        ))}
                    </Grid>

                    {/* ── Action buttons ── */}
                    <Stack direction="row" spacing={2} sx={{ marginTop: "1.5rem", flexWrap: "wrap" }}>
                        <Button
                            variant="outlined"
                            color="error"
                            disabled={selectedGestures.size === 0}
                            onClick={() => setConfirmDeleteOpen(true)}
                        >
                            Delete Selected
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            disabled={selectedGestures.size === 0}
                            onClick={() => setGenerateModelOpen(true)}
                        >
                            Generate Gesture Model
                        </Button>
                    </Stack>

                    {isGenerating && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ marginTop: "1rem" }}>
                            <CircularProgress size={20} />
                            <Typography>Generating gesture model…</Typography>
                        </Stack>
                    )}


                    {/* ── Gesture Models section ── */}
                    {gestureModels.length > 0 && (
                        <div style={{ marginTop: "3rem" }}>
                            <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: "1.5rem" }}>
                                Your Gesture Models:
                            </Typography>
                            {gestureModels.map((model) => (
                                <div key={model.id} style={{ marginBottom: "2.5rem" }}>
                                    <Typography variant="h6" sx={{ fontWeight: "bold", marginBottom: "1rem" }}>
                                        {model.modelName}
                                    </Typography>
                                    <Grid container spacing={3}>
                                        {Object.entries(model.templates || {}).map(([gestureName, template]) => (
                                            <Grid item xs={12} sm={6} md={4} key={gestureName}>
                                                <GestureTemplateChart
                                                    template={template}
                                                    gestureName={gestureName}
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        size="small"
                                        onClick={() => downloadModelTsv(model)}
                                        sx={{ marginTop: "1rem" }}
                                    >
                                        Download .tsv
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Delete confirmation dialog ── */}
                    <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
                        <DialogTitle>
                            Delete Gesture {selectedGestures.size > 1 ? "Categories" : "Category"}
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Are you sure you want to delete all data for{" "}
                                <strong>{selectedArray.join(", ")}</strong>?{" "}
                                This cannot be undone.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
                            <Button onClick={handleDeleteConfirmed} color="error" variant="contained">
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* ── Generate model dialog ── */}
                    <Dialog open={generateModelOpen} onClose={() => setGenerateModelOpen(false)}>
                        <DialogTitle>Name Your Gesture Model</DialogTitle>
                        <DialogContent>
                            <DialogContentText sx={{ marginBottom: "1rem" }}>
                                A template will be generated for:{" "}
                                <strong>{selectedArray.join(", ")}</strong>
                            </DialogContentText>
                            <TextField
                                autoFocus
                                label="Model Name"
                                fullWidth
                                value={modelNameInput}
                                onChange={(e) => setModelNameInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleGenerateModel(); }}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setGenerateModelOpen(false)}>Cancel</Button>
                            <Button
                                onClick={handleGenerateModel}
                                color="secondary"
                                variant="contained"
                                disabled={!modelNameInput.trim()}
                            >
                                Generate
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Container>
            </div>
        )
    );
}
