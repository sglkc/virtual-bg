import { elements } from './domElements.js';

export function setupUI(bokehSettings, handlers) {
    const {
        foregroundThreshold, foregroundThresholdValue,
        backgroundBlur, backgroundBlurValue,
        edgeBlur, edgeBlurValue,
        flipHorizontal, resetSettings, settingsPanel,
        cameraBtn, cameraSelect, blurToggleBtn
    } = elements;

    // Settings listeners
    foregroundThreshold.addEventListener('input', (e) => {
        bokehSettings.foregroundThreshold = parseFloat(e.target.value);
        foregroundThresholdValue.textContent = e.target.value;
    });

    backgroundBlur.addEventListener('input', (e) => {
        bokehSettings.backgroundBlurAmount = parseInt(e.target.value, 10);
        backgroundBlurValue.textContent = e.target.value;
    });

    edgeBlur.addEventListener('input', (e) => {
        bokehSettings.edgeBlurAmount = parseInt(e.target.value, 10);
        edgeBlurValue.textContent = e.target.value;
    });

    flipHorizontal.addEventListener('change', (e) => {
        bokehSettings.flipHorizontal = e.target.checked;
    });

    resetSettings.addEventListener('click', () => {
        bokehSettings.foregroundThreshold = 0.5;
        bokehSettings.backgroundBlurAmount = 10;
        bokehSettings.edgeBlurAmount = 3;
        bokehSettings.flipHorizontal = false;

        foregroundThreshold.value = bokehSettings.foregroundThreshold;
        foregroundThresholdValue.textContent = bokehSettings.foregroundThreshold;
        backgroundBlur.value = bokehSettings.backgroundBlurAmount;
        backgroundBlurValue.textContent = bokehSettings.backgroundBlurAmount;
        edgeBlur.value = bokehSettings.edgeBlurAmount;
        edgeBlurValue.textContent = bokehSettings.edgeBlurAmount;
        flipHorizontal.checked = bokehSettings.flipHorizontal;
    });

    // Buttons
    cameraBtn.addEventListener('click', (e) => { handlers.toggleCamera(e); });
    cameraSelect.addEventListener('change', (e) => { handlers.switchCamera(e); });
    blurToggleBtn.addEventListener('click', (e) => { handlers.toggleBlur(e); });

    // Initial UI state
    settingsPanel.style.display = 'none';
    cameraSelect.parentElement.style.display = 'flex';
    cameraSelect.disabled = true;
}
