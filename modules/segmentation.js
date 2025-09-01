import { elements } from './domElements.js';

export class SegmentationManager {
    constructor(bokehSettings) {
        this.segmenter = null;
        this.isModelLoading = false;
        this.bokehSettings = bokehSettings;
        this.outputCanvas = elements.outputCanvas;
        this.video = elements.video;
        this.animationFrame = null;
    }

    async loadModel() {
        if (this.segmenter || this.isModelLoading) return this.segmenter;
        this.isModelLoading = true;
        elements.loadingIndicator.style.display = 'flex';
        elements.loadingText.textContent = 'Loading AI model...';

        try {
            const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
            const segmenterConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1',
                modelType: 'general'
            };

            this.segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
            return this.segmenter;
        } finally {
            this.isModelLoading = false;
            elements.loadingIndicator.style.display = 'none';
            elements.loadingText.textContent = '';
        }
    }

    start() {
        if (!this.segmenter) return;

        this.outputCanvas.width = this.video.videoWidth;
        this.outputCanvas.height = this.video.videoHeight;
        this.outputCanvas.style.display = 'block';
        this.video.style.visibility = 'hidden';

        const process = async () => {
            try {
                const segmentation = await this.segmenter.segmentPeople(this.video);
                await bodySegmentation.drawBokehEffect(
                    this.outputCanvas, this.video, segmentation,
                    this.bokehSettings.foregroundThreshold,
                    this.bokehSettings.backgroundBlurAmount,
                    this.bokehSettings.edgeBlurAmount,
                    this.bokehSettings.flipHorizontal
                );
            } catch (err) {
                console.error('Segmentation frame error', err);
            }

            this.animationFrame = requestAnimationFrame(process);
        };

        process();
    }

    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.outputCanvas.style.display = 'none';
        this.video.style.visibility = 'visible';
    }
}
