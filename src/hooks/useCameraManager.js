import { useState } from 'react';

const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

const isIOSDevice = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const enumerateCameras = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
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

    const constraints = {
        audio: false,
        video: {
            width: { ideal: isIOS ? 1280 : (isMobile ? 1920 : 1280) },
            height: { ideal: isIOS ? 720 : (isMobile ? 1080 : 720) },
            frameRate: { ideal: 30, max: 30 }
        }
    };
    
    if (isIOS && availableCameras) {
        const targetCamera = preferBack ? availableCameras.back : availableCameras.front;
        
        if (targetCamera?.deviceId) {
            constraints.video.deviceId = { exact: targetCamera.deviceId };
            delete constraints.video.facingMode;
            
            return constraints;
        }
    }
    
    if (!isIOS && availableCameras) {
        const targetCamera = preferBack ? availableCameras.back : availableCameras.front;
        
        if (targetCamera?.deviceId) {
            constraints.video.deviceId = { ideal: targetCamera.deviceId };
            return constraints;
        }
    }
    
    if (isIOS) {
        constraints.video.facingMode = { exact: preferBack ? 'environment' : 'user' };
    } else {
        constraints.video.facingMode = preferBack ? 'environment' : 'user';
    }
    
    return constraints;
};

export const useCameraManager = () => {
    const [cameraFacing, setCameraFacing] = useState(null);
    const [cameraKey, setCameraKey] = useState(0);
    const [availableCameras, setAvailableCameras] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');

    const initializeCameras = async () => {
        if (isInitialized) return;

        setDebugInfo('Initializing cameras...');
        const cameras = await enumerateCameras();
        setAvailableCameras(cameras);
        setIsInitialized(true);
        
        if (cameras.back) {
            setCameraFacing('back');
        } else if (cameras.front) {
            setCameraFacing('front');
        } else {
            setCameraFacing('back');
        }
    };



    const switchCamera = async () => {
        const newFacing = cameraFacing === 'back' ? 'front' : 'back';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => {
                track.stop();
            });
        } catch (e) {
            // No active streams to stop
        }

        setCameraFacing(newFacing);
        setCameraKey(prev => prev + 1);
        
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
        
        if (isIOSDevice()) {
            setTimeout(() => {}, 200);
        }
    };

    const getCameraConfig = () => {
        if (!cameraFacing || !isInitialized) {
            return {
                audio: false,
                video: true
            };
        }

        if (availableCameras && availableCameras.all.length === 1) {
            return {
                audio: false,
                video: true
            };
        }

        const constraints = getCameraConstraints(cameraFacing === 'back', availableCameras);
        
        return constraints;
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
        availableCameras
    };
}; 