import { elements } from './modules/domElements.js';
import { DeviceManager } from './modules/deviceManager.js';
import { SegmentationManager } from './modules/segmentation.js';
import { setupUI } from './modules/ui.js';

class VirtualBackgroundApp {
    constructor() {
        this.currentStream = null;
        this.deviceManager = new DeviceManager();
        this.bokehSettings = {
            foregroundThreshold: 0.5,
            backgroundBlurAmount: 10,
            edgeBlurAmount: 3,
            flipHorizontal: false
        };
        this.segmentationManager = new SegmentationManager(this.bokehSettings);
        this.isCameraActive = false;
        this.isBlurEnabled = false;

        setupUI(this.bokehSettings, {
            toggleCamera: () => this.toggleCamera(),
            switchCamera: () => this.switchCamera(),
            toggleBlur: () => this.toggleBlur()
        });

        // Populate devices on start
        this.deviceManager.getCameraDevices()
            .then(() => { elements.cameraSelect.disabled = false; })
            .catch(() => { /* ignore */ });

        elements.status.textContent = 'Click "Start Camera" to begin. Camera permissions will be requested when you start.';
    }

    async startCamera() {
        try {
            await this.deviceManager.getCameraDevices();
            let selectedDeviceId = elements.cameraSelect.value;
            if (!selectedDeviceId && this.deviceManager.devices.length > 0) {
                selectedDeviceId = this.deviceManager.devices[0].deviceId;
                elements.cameraSelect.value = selectedDeviceId;
            }

            if (!selectedDeviceId) {
                this.updateStatus('Please select a camera first.', 'error');
                return;
            }

            if (this.currentStream) this.stopCamera();

            const constraints = { video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false };
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            elements.video.srcObject = this.currentStream;

            this.isCameraActive = true;
            elements.cameraBtn.textContent = 'Stop Camera';
            elements.cameraBtn.classList.remove('start-btn');
            elements.cameraBtn.classList.add('stop-btn');
            elements.cameraSelect.disabled = false;
            elements.blurToggleBtn.disabled = false;
            elements.cameraSelect.parentElement.style.display = 'flex';

            this.updateStatus('Camera is active. You can now enable background blur.', 'active');
        } catch (err) {
            console.error('Error starting camera', err);
            if (err.name === 'NotAllowedError') this.updateStatus('Camera access denied. Please grant camera permissions and try again.', 'error');
            else if (err.name === 'NotFoundError') this.updateStatus('Camera not found. Please check your camera connection.', 'error');
            else this.updateStatus('Error starting camera. Please try a different camera.', 'error');
        }
    }

    stopCamera() {
        if (this.segmentationManager) this.segmentationManager.stop();

        if (this.currentStream) {
            this.currentStream.getTracks().forEach(t => t.stop());
            this.currentStream = null;
        }

        elements.video.srcObject = null;
        this.isCameraActive = false;
        elements.cameraBtn.textContent = 'Start Camera';
        elements.cameraBtn.classList.remove('stop-btn');
        elements.cameraBtn.classList.add('start-btn');
        elements.blurToggleBtn.disabled = true;
        elements.blurToggleBtn.textContent = 'Enable Background Blur';
        elements.blurToggleBtn.classList.remove('active');
        elements.cameraSelect.parentElement.style.display = 'flex';

        this.updateStatus('Camera stopped and stream released.', 'inactive');
    }

    async switchCamera() {
        if (this.currentStream && elements.cameraSelect.value) {
            await this.startCamera();
        }
    }

    // Add toggleCamera to match UI handler
    async toggleCamera() {
        if (this.isCameraActive) {
            this.stopCamera();
        } else {
            await this.startCamera();
        }
    }

    updateStatus(message, type) {
        elements.status.textContent = message;
        elements.status.className = `status ${type}`;
    }

    async toggleBlur() {
        if (this.segmentationManager.isModelLoading) return;
        if (!this.isBlurEnabled) {
            try {
                await this.segmentationManager.loadModel();
                elements.settingsPanel.style.display = 'block';
                this.isBlurEnabled = true;
                elements.blurToggleBtn.textContent = 'Disable Background Blur';
                elements.blurToggleBtn.classList.add('active');
                this.segmentationManager.start();
                this.updateStatus('Background blur enabled. AI is processing video.', 'active');
            } catch (err) {
                console.error('Error enabling blur', err);
                this.updateStatus('Failed to enable background blur.', 'error');
            }
        } else {
            elements.settingsPanel.style.display = 'none';
            this.isBlurEnabled = false;
            elements.blurToggleBtn.textContent = 'Enable Background Blur';
            elements.blurToggleBtn.classList.remove('active');
            this.segmentationManager.stop();
            this.updateStatus('Background blur disabled.', 'active');
        }
    }
}

// Initialize
new VirtualBackgroundApp()
