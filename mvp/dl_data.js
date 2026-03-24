const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { parse } = require('json2csv');

console.log("🔥 Script started");

const serviceAccount = require("C:/Repositories/sk-exp-firebase-adminsdk-5o35c-667b278caa.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const collectionName = 'gesture_data';
const userId = 'nT3T0twP4xS5XJJyNaXRNY89sZs1';
const allowedGestureNames = new Set(['shake_head_no', 'nod_head_yes', 'circle_cw', 'circle_ccw', 'right_lean_nod_up', 'inverted_triangle']);


async function exportUserIMUData() {

  const snapshot = await db.collection(collectionName).get();
  console.log("📋 Scanning all documents in collection:", collectionName);

  const rows = [];

  snapshot.forEach(doc => {
    const docData = doc.data();
    
    // ✅ FILTER by userId manually
    if (docData.userId !== userId) return;

  
    const gestureName = docData.gestureName ?? '';
    if (!allowedGestureNames.has(gestureName)) return;

    const location = docData.location ?? '';
    const gestureTimestamp = docData.timestamp ?? '';
    const samples = docData.data ?? [];
  
    if (Array.isArray(samples)) {
      samples.forEach((sample, index) => {
        rows.push({
          user_id: userId,
          gesture_id: doc.id,
          gesture_name: gestureName,
          location: location,
          gesture_timestamp: gestureTimestamp,
          sample_timestamp: sample.ts ?? '',
          index: sample.seq ?? index,
          acc_x: sample.acc?.[0] ?? '',
          acc_y: sample.acc?.[1] ?? '',
          acc_z: sample.acc?.[2] ?? '',
          gyro_x: sample.gyro?.[0] ?? '',
          gyro_y: sample.gyro?.[1] ?? '',
          gyro_z: sample.gyro?.[2] ?? ''
        });
      });
    }
  });
  
  if (rows.length === 0) {
    console.error(`❌ No gesture data found for user "${userId}"`);
    return;
  }

  console.log(`🧾 Found ${rows.length} IMU samples to export.`);

  const csv = parse(rows, {
    fields: [
      'user_id',
      'gesture_id',
      'gesture_name',
      'location',
      'gesture_timestamp',
      'sample_timestamp',
      'index',
      'acc_x',
      'acc_y',
      'acc_z',
      'gyro_x',
      'gyro_y',
      'gyro_z'
    ]
  });

  const filename = `C:/Repositories/gesture_models/${userId}_raw_Sandra.csv`;
  const outputDir = path.dirname(filename);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(filename, csv);
  console.log(`✅ Exported IMU data for user "${userId}" to ${filename}`);
}

exportUserIMUData().catch(err => {
  console.error("❌ Script crashed with error:", err);
});
