import React, { useState } from 'react';

function BluetoothConnector({ onCharacteristicsReady, setBluetoothConnected }) {
    const [isConnected, setIsConnected] = useState(false);
    const [device, setDevice] = useState(null);

    const handleBluetoothToggle = async () => {
        const motionServiceUUID = "01912446-e5aa-9ee9-0e19-000e7e57049c";
        const accelerometerCharacteristicUUID = "00800000-0001-11e1-ac36-0002a5d5c51b";
        const enableCharacteristicUUID = "00001524-1212-efde-1523-785feabcd123";

        if (isConnected && device) {
            try {
                console.log(`Disconnecting ${device.name}...`);
                await device.gatt.disconnect();
                setDevice(null);
                setIsConnected(false);
                setBluetoothConnected(false); // ✅ Bluetooth is now disconnected
                console.log('Device disconnected.');
            } catch (error) {
                console.error('Error disconnecting device:', error);
            }
            return;
        }

        try {
            console.log('Looking for devices...');
            const newDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [motionServiceUUID],
            });

            console.log('Device selected:', newDevice);

            const server = await newDevice.gatt.connect();
            console.log('Connected to GATT server.');

            const motionService = await server.getPrimaryService(motionServiceUUID);
            console.log('Motion service obtained:', motionService);

            const enableCharacteristic = await motionService.getCharacteristic(enableCharacteristicUUID);
            console.log('Enable characteristic obtained:', enableCharacteristic);

            const accelerometerCharacteristic = await motionService.getCharacteristic(accelerometerCharacteristicUUID);
            console.log('Accelerometer characteristic obtained:', accelerometerCharacteristic);

            setDevice(newDevice);
            setIsConnected(true);
            setBluetoothConnected(true); // ✅ Bluetooth is now connected

            // Pass characteristics to parent component
            if (onCharacteristicsReady) {
                onCharacteristicsReady(enableCharacteristic, accelerometerCharacteristic);
            }

            // Set up disconnection listener
            newDevice.addEventListener('gattserverdisconnected', () => {
                console.log('Device disconnected.');
                setDevice(null);
                setIsConnected(false);
                setBluetoothConnected(false); // ✅ Update state on disconnect
                if (onCharacteristicsReady) {
                    onCharacteristicsReady(null, null);
                }
            });
        } catch (error) {
            console.error('Error during connection process:', error);
        }
    };

    return (
        <div>
            <button onClick={handleBluetoothToggle}>
                {isConnected ? 'Disconnect Device' : 'Connect Device'}
            </button>
            <p>Status: {isConnected ? `Connected to ${device?.name}` : 'Not Connected'}</p>
        </div>
    );
}

export default BluetoothConnector;
