class VirtualBackgroundApp {
    constructor() {
        this.video = document.getElementById('video');
        this.cameraSelect = document.getElementById('cameraSelect');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.status = document.getElementById('status');
        
        this.currentStream = null;
        this.devices = [];
        
        this.init();
    }

    async init() {
        try {
            // Set up event listeners
            this.startBtn.addEventListener('click', () => this.startCamera());
            this.stopBtn.addEventListener('click', () => this.stopCamera());
            this.cameraSelect.addEventListener('change', () => this.switchCamera());
            
            // Hide camera selector initially
            this.cameraSelect.parentElement.style.display = 'none';
            
            this.updateStatus('Click "Start Camera" to begin. Camera permissions will be requested when you start.', 'inactive');
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateStatus('Error initializing application.', 'error');
        }
    }

    async getCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.devices = devices.filter(device => device.kind === 'videoinput');
            
            // Populate camera select
            this.cameraSelect.innerHTML = '<option value="">Select Camera...</option>';
            this.devices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${index + 1}`;
                this.cameraSelect.appendChild(option);
            });
            
            // Auto-select first camera if available
            if (this.devices.length > 0) {
                this.cameraSelect.value = this.devices[0].deviceId;
            }
        } catch (error) {
            console.error('Error getting camera devices:', error);
            this.updateStatus('Error accessing camera list. Please check permissions.', 'error');
        }
    }

    async startCamera() {
        try {
            // Get camera devices first (this will request permission)
            await this.getCameraDevices();
            
            const selectedDeviceId = this.cameraSelect.value;
            
            if (!selectedDeviceId) {
                this.updateStatus('Please select a camera first.', 'error');
                return;
            }

            // Stop current stream if exists
            if (this.currentStream) {
                this.stopCamera();
            }

            const constraints = {
                video: {
                    deviceId: { exact: selectedDeviceId },
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            };

            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;

            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.cameraSelect.disabled = false;
            
            // Show camera selector when camera is active
            this.cameraSelect.parentElement.style.display = 'flex';

            this.updateStatus('Camera is active. Background effects will be applied here.', 'active');
        } catch (error) {
            console.error('Error starting camera:', error);
            if (error.name === 'NotAllowedError') {
                this.updateStatus('Camera access denied. Please grant camera permissions and try again.', 'error');
            } else if (error.name === 'NotFoundError') {
                this.updateStatus('Camera not found. Please check your camera connection.', 'error');
            } else {
                this.updateStatus('Error starting camera. Please try a different camera.', 'error');
            }
        }
    }

    stopCamera() {
        if (this.currentStream) {
            // Stop all tracks to properly release the camera
            this.currentStream.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped track:', track.kind);
            });
            this.currentStream = null;
        }

        // Clear the video source
        this.video.srcObject = null;
        
        // Reset button states
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        // Hide camera selector when camera is stopped
        this.cameraSelect.parentElement.style.display = 'none';

        this.updateStatus('Camera stopped and stream released.', 'inactive');
    }

    async switchCamera() {
        if (this.currentStream && this.cameraSelect.value) {
            await this.startCamera();
        }
    }

    updateStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VirtualBackgroundApp();
});
