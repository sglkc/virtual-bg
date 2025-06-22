class VirtualBackgroundApp {
    constructor() {
        this.video = document.getElementById('video');
        this.outputCanvas = document.getElementById('outputCanvas');
        this.cameraSelect = document.getElementById('cameraSelect');
        this.cameraBtn = document.getElementById('cameraBtn');
        this.blurToggleBtn = document.getElementById('blurToggleBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.loadingText = document.getElementById('loadingText');
        this.status = document.getElementById('status');
        
        this.currentStream = null;
        this.devices = [];
        this.segmenter = null;
        this.isBlurEnabled = false;
        this.isModelLoading = false;
        this.animationFrame = null;
        this.isCameraActive = false;
        
        this.init();
    }

    async init() {
        try {
            // Set up event listeners
            this.cameraBtn.addEventListener('click', () => this.toggleCamera());
            this.cameraSelect.addEventListener('change', () => this.switchCamera());
            this.blurToggleBtn.addEventListener('click', () => this.toggleBlur());
            
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

            this.isCameraActive = true;
            this.cameraBtn.textContent = 'Stop Camera';
            this.cameraBtn.classList.remove('start-btn');
            this.cameraBtn.classList.add('stop-btn');
            this.cameraSelect.disabled = false;
            this.blurToggleBtn.disabled = false;
            
            // Show camera selector when camera is active
            this.cameraSelect.parentElement.style.display = 'flex';

            this.updateStatus('Camera is active. You can now enable background blur.', 'active');
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
        // Stop segmentation processing
        this.stopSegmentation();
        
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
        this.isCameraActive = false;
        this.cameraBtn.textContent = 'Start Camera';
        this.cameraBtn.classList.remove('stop-btn');
        this.cameraBtn.classList.add('start-btn');
        this.blurToggleBtn.disabled = true;
        this.blurToggleBtn.textContent = 'Enable Background Blur';
        this.blurToggleBtn.classList.remove('active');
        
        // Hide camera selector when camera is stopped
        this.cameraSelect.parentElement.style.display = 'none';

        this.updateStatus('Camera stopped and stream released.', 'inactive');
    }

    async switchCamera() {
        if (this.currentStream && this.cameraSelect.value) {
            await this.startCamera();
        }
    }

    async toggleCamera() {
        if (this.isCameraActive) {
            this.stopCamera();
        } else {
            await this.startCamera();
        }
    }

    updateStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }

    async loadSegmentationModel() {
        if (this.segmenter || this.isModelLoading) {
            return this.segmenter;
        }

        this.isModelLoading = true;
        this.showLoading('Loading AI model...');

        try {
            // Load MediaPipe Selfie Segmentation model
            const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
            const segmenterConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1',
                modelType: 'general'
            };

            this.segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
            console.log('Segmentation model loaded successfully');
            
            this.hideLoading();
            this.isModelLoading = false;
            return this.segmenter;
        } catch (error) {
            console.error('Error loading segmentation model:', error);
            this.hideLoading();
            this.isModelLoading = false;
            this.updateStatus('Error loading AI model. Please try again.', 'error');
            throw error;
        }
    }

    async toggleBlur() {
        if (this.isModelLoading) {
            return;
        }

        if (!this.isBlurEnabled) {
            // Enable blur
            try {
                await this.loadSegmentationModel();
                this.isBlurEnabled = true;
                this.blurToggleBtn.textContent = 'Disable Background Blur';
                this.blurToggleBtn.classList.add('active');
                this.startSegmentation();
                this.updateStatus('Background blur enabled. AI is processing video.', 'active');
            } catch (error) {
                console.error('Error enabling blur:', error);
                this.updateStatus('Failed to enable background blur.', 'error');
            }
        } else {
            // Disable blur
            this.isBlurEnabled = false;
            this.blurToggleBtn.textContent = 'Enable Background Blur';
            this.blurToggleBtn.classList.remove('active');
            this.stopSegmentation();
            this.updateStatus('Background blur disabled.', 'active');
        }
    }

    startSegmentation() {
        if (!this.segmenter || !this.isBlurEnabled) {
            return;
        }

        // Show canvas and hide video
        this.outputCanvas.style.display = 'block';
        // this.video.style.display = 'none';

        const processFrame = async () => {
            if (!this.isBlurEnabled || !this.segmenter) {
                return;
            }

            try {
                // Get segmentation
                const segmentation = await this.segmenter.segmentPeople(this.video);
                
                // Use the built-in drawBokehEffect method
                await this.drawBlurredBackground(null, segmentation);
                
                // Continue processing
                this.animationFrame = requestAnimationFrame(processFrame);
            } catch (error) {
                console.error('Error processing frame:', error);
            }
        };

        processFrame();
    }

    stopSegmentation() {
        this.isBlurEnabled = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Hide canvas and show video
        this.outputCanvas.style.display = 'none';
        // this.video.style.display = 'block';
    }

    async drawBlurredBackground(ctx, segmentation) {
        // Use the built-in TensorFlow.js bodySegmentation.drawBokehEffect method
        const canvas = this.outputCanvas;
        const foregroundThreshold = 0.5;
        const backgroundBlurAmount = 10;
        const edgeBlurAmount = 3;
        const flipHorizontal = false;

        await bodySegmentation.drawBokehEffect(
            canvas, this.video, segmentation, 
            foregroundThreshold, backgroundBlurAmount, edgeBlurAmount, flipHorizontal
        );
    }

    showLoading(message) {
        this.loadingText.textContent = message;
        this.loadingIndicator.style.display = 'flex';
        this.blurToggleBtn.disabled = true;
    }

    hideLoading() {
        this.loadingIndicator.style.display = 'none';
        this.blurToggleBtn.disabled = false;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VirtualBackgroundApp();
});
