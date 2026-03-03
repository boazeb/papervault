import { useState } from 'react';

// Camera utility functions
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

const isIOSDevice = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Enumerate camera devices to get specific deviceIds
const enumerateCameras = async () => {
    try {
        // Request permissions first to get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Stop the stream immediately since we only needed it for permissions
        stream.getTracks().forEach(track => track.stop());
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Try to identify front and back cameras
        const backCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment') ||
            device.label.toLowerCase().includes('rear')
        );
        
        const frontCamera = videoDevices.find(device =>
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('user') ||
            device.label.toLowerCase().includes('selfie') ||
            device.label.toLowerCase().includes('face')
        );
        
        // If we can't identify by label, assume first device is front, second is back (common mobile pattern)
        const fallbackFront = !frontCamera && videoDevices.length > 0 ? videoDevices[0] : frontCamera;
        const fallbackBack = !backCamera && videoDevices.length > 1 ? videoDevices[1] : backCamera;
        
        const result = {
            front: fallbackFront,
            back: fallbackBack,
            all: videoDevices
        };
        
        return result;
    } catch (error) {
        return { front: null, back: null, all: [] };
    }
};

const getCameraConstraints = (preferBack = true, availableCameras = null) => {
    const isMobile = isMobileDevice();
    const isIOS = isIOSDevice();
    
    // Base constraints - reduced resolution for better iOS compatibility
    const constraints = {
        audio: false,
        video: {
            width: { ideal: isIOS ? 1280 : (isMobile ? 1920 : 1280) },
            height: { ideal: isIOS ? 720 : (isMobile ? 1080 : 720) },
            frameRate: { ideal: 30, max: 30 }
        }
    };
    
    // Aggressive iOS deviceId approach
    if (isIOS && availableCameras) {
        const targetCamera = preferBack ? availableCameras.back : availableCameras.front;
        
        if (targetCamera?.deviceId) {
            // iOS specific: Use exact deviceId with no facingMode fallback
            constraints.video.deviceId = { exact: targetCamera.deviceId };
            
            // Remove any conflicting constraints
            delete constraints.video.facingMode;
            
            return constraints;
        }
    }
    
    // Non-iOS deviceId approach
    if (!isIOS && availableCameras) {
        const targetCamera = preferBack ? availableCameras.back : availableCameras.front;
        
        if (targetCamera?.deviceId) {
            constraints.video.deviceId = { ideal: targetCamera.deviceId };
            return constraints;
        }
    }
    
    // Fallback to facingMode approach
    if (isIOS) {
        // iOS: Use exact facingMode as last resort
        constraints.video.facingMode = { exact: preferBack ? 'environment' : 'user' };
    } else {
        // Other devices: Use simple facingMode
        constraints.video.facingMode = preferBack ? 'environment' : 'user';
    }
    
    return constraints;
};

export const useCameraManager = () => {
    const [cameraFacing, setCameraFacing] = useState(null); // Start with null until we know what's available
    const [cameraKey, setCameraKey] = useState(0); // Force QR Reader remount
    const [availableCameras, setAvailableCameras] = useState(null); // Camera device enumeration
    const [cameraError, setCameraError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [debugInfo, setDebugInfo] = useState(''); // On-screen debug info

    // Smart initialization - set camera facing based on available hardware
    const initializeCameras = async () => {
        if (isInitialized) return; // Already initialized
        
        setDebugInfo('Initializing cameras...');
        const cameras = await enumerateCameras();
        setAvailableCameras(cameras);
        setIsInitialized(true);
        
        // Smart camera selection based on available hardware
        if (cameras.back) {
            // Back camera available - prefer it for QR scanning
            setCameraFacing('back');
        } else if (cameras.front) {
            // Only front camera available - use it
            setCameraFacing('front');
        } else if (cameras.all.length > 0) {
            // Some camera available but type unknown - default to back
            setCameraFacing('back');
        } else {
            // No cameras found
            setCameraFacing('back'); // Fallback
        }
    };



    const switchCamera = async () => {
        const newFacing = cameraFacing === 'back' ? 'front' : 'back';
        
        // Stop all existing camera streams aggressively
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => {
                track.stop();
            });
        } catch (e) {
            // No active streams to stop
        }
        
        // Update state
        setCameraFacing(newFacing);
        setCameraKey(prev => prev + 1);
        
        // Enhanced debug info
        if (availableCameras) {
            const targetCamera = availableCameras[newFacing];
            if (targetCamera) {
                const label = targetCamera.label?.substring(0, 30) || 'Unknown Camera';
                const deviceId = targetCamera.deviceId?.substring(0, 10) || 'No ID';
                setDebugInfo(`Switching to ${newFacing}: ${label}... (${deviceId}...)`);
            } else {
                setDebugInfo(`No ${newFacing} camera found, using facingMode`);
            }
        } else {
            setDebugInfo(`Switching to ${newFacing} (cameras not enumerated)`);
        }
        
        // Additional delay to ensure stream cleanup on iOS
        if (isIOSDevice()) {
            setTimeout(() => {
                // iOS delay complete
            }, 200);
        }
    };

    // Enhanced camera constraints with verification
    const getCameraConfig = () => {
        // Don't build constraints until we know what cameras are available
        if (!cameraFacing || !isInitialized) {
            return {
                audio: false,
                video: true // Basic fallback constraints
            };
        }
        
        // For single camera devices, use minimal constraints - let ModernQRScanner handle everything
        if (availableCameras && availableCameras.all.length === 1) {
            return {
                audio: false,
                video: true // Minimal constraints for single camera
            };
        }
        
        // Only build complex constraints for multi-camera devices
        const constraints = getCameraConstraints(cameraFacing === 'back', availableCameras);
        
        return constraints;
    };

    // Add stream verification function
    const verifyStream = (stream) => {
        if (!stream || !isIOSDevice()) return;
        
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            // Update debug with actual vs expected
            const expectedCamera = availableCameras?.[cameraFacing];
            const isCorrectCamera = expectedCamera && videoTrack.getSettings()?.deviceId === expectedCamera.deviceId;
            
            if (isCorrectCamera) {
                setDebugInfo(`Correct camera active: ${videoTrack.label.substring(0, 25)}...`);
            } else {
                setDebugInfo(`Wrong camera! Expected: ${expectedCamera?.label.substring(0, 15)}... Got: ${videoTrack.label.substring(0, 15)}...`);
            }
        }
    };

    // Test functions for mobile debugging
    const forceBackCamera = () => {
        setCameraFacing('back');
        setCameraKey(prev => prev + 1);
        
        if (availableCameras?.back) {
            setDebugInfo(`FORCE BACK: ${availableCameras.back.label.substring(0, 25)}... (deviceId: ${availableCameras.back.deviceId.substring(0, 8)}...)`);
        } else {
            setDebugInfo('FORCE BACK: No back camera found');
        }
    };
    
    const forceFrontCamera = () => {
        setCameraFacing('front');
        setCameraKey(prev => prev + 1);
        
        if (availableCameras?.front) {
            setDebugInfo(`FORCE FRONT: ${availableCameras.front.label.substring(0, 25)}... (deviceId: ${availableCameras.front.deviceId.substring(0, 8)}...)`);
        } else {
            setDebugInfo('FORCE FRONT: No front camera found');
        }
    };

    // Nuclear option for iOS camera switching
    const forceIOSCameraReset = async () => {
        if (!isIOSDevice()) {
            return;
        }
        
        setDebugInfo('Nuclear reset: forcing iOS camera switch...');
        
        const originalFacing = cameraFacing;
        const oppositeFacing = cameraFacing === 'back' ? 'front' : 'back';
        
        // Step 1: Switch to opposite camera
        setCameraFacing(oppositeFacing);
        setCameraKey(prev => prev + 1);
        
        // Wait for switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 2: Switch back to original camera
        setCameraFacing(originalFacing);
        setCameraKey(prev => prev + 1);
        
        setDebugInfo(`Nuclear reset complete - targeting ${originalFacing} camera`);
    };

    return {
        cameraFacing,
        cameraKey,
        switchCamera,
        getCameraConfig,
        cameraError,
        setCameraError,
        initializeCameras,
        isInitialized,
        debugInfo,
        forceBackCamera,
        forceFrontCamera,
        verifyStream,  // New stream verification function
        forceIOSCameraReset,  // New nuclear option function
        availableCameras // Expose camera info so scanner can coordinate
    };
}; 