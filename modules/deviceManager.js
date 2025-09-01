import { elements } from './domElements.js';

export class DeviceManager {
    constructor() {
        this.devices = [];
        this.cameraSelect = elements.cameraSelect;
    }

    async getCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.devices = devices.filter(d => d.kind === 'videoinput');

            this.cameraSelect.innerHTML = '<option value="">Select Camera...</option>';
            this.devices.forEach((device, idx) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${idx + 1}`;
                this.cameraSelect.appendChild(option);
            });

            if (this.devices.length > 0) {
                this.cameraSelect.value = this.devices[0].deviceId;
            }

            return this.devices;
        } catch (err) {
            console.error('Error enumerating devices', err);
            throw err;
        }
    }
}
