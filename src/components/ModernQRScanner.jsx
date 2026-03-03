import React, { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { FaExclamationTriangle, FaSyncAlt, FaCamera, FaBolt } from 'react-icons/fa';

const ModernQRScanner = ({
    onResult,
    onError,
    constraints = {},
    containerStyle = {},
    videoStyle = {},
    isProcessing = false,
    cameraKey = 0, // For compatibility with old system
    className = '',
    externalCameras = null, // Camera info from useCameraManager
    externalCameraReady = false // Whether external camera manager is ready
}) => {
    // Override any conflicting constraints immediately to prevent OverconstrainedError
    const safeConstraints = { ...constraints };
    
    // Remove ALL external video constraints to prevent conflicts - we'll build our own
    if (safeConstraints.video && typeof safeConstraints.video === 'object') {
        // Keep only audio: false, ignore all external video constraints
        safeConstraints.video = true;
    }
    const [error, setError] = useState(null);
    const [currentDevice, setCurrentDevice] = useState(null);
    const [availableDevices, setAvailableDevices] = useState([]);
    const [hasFlash, setHasFlash] = useState(false);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isMounted, setIsMounted] = useState(true);
    const mountedRef = useRef(true);
    const [retryCount, setRetryCount] = useState(0);
    const [isStable, setIsStable] = useState(false);

    // Track component mounting state (ref for use in deferred callbacks)
    useEffect(() => {
        mountedRef.current = true;
        setIsMounted(true);
        return () => {
            mountedRef.current = false;
            setIsMounted(false);
        };
    }, []);
    
    // Get available camera devices - use external info when available
    useEffect(() => {
        const setupCameras = async () => {
            try {
                // If external camera manager has provided info and it's ready, use that
                if (externalCameras && externalCameraReady && externalCameras.all) {
                    const videoDevices = externalCameras.all;
                    
                    if (!isMounted) return;
                    
                    setAvailableDevices(videoDevices);
                    
                    // For single camera, trust the external manager completely
                    if (videoDevices.length === 1) {
                        setCurrentDevice(null);
                        setIsStable(true);
                        return;
                    }
                    
                    // For multiple cameras, use external logic
                    setIsStable(true);
                    return;
                }
                
                // Fallback: do our own enumeration (for backward compatibility)
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                
                if (!isMounted) return;
                
                setAvailableDevices(videoDevices);
                
                // For single camera devices, don't do any device selection
                if (videoDevices.length === 1) {
                    setCurrentDevice(null);
                    setIsStable(true);
                } else if (videoDevices.length > 1) {
                    // Multi-camera device selection
                    const backCamera = videoDevices.find(device => 
                        device.label.toLowerCase().includes('back') || 
                        device.label.toLowerCase().includes('environment') ||
                        device.label.toLowerCase().includes('rear')
                    );
                    
                    const frontCamera = videoDevices.find(device =>
                        device.label.toLowerCase().includes('front') ||
                        device.label.toLowerCase().includes('user') ||
                        device.label.toLowerCase().includes('facetime') ||
                        device.label.toLowerCase().includes('selfie')
                    );
                    
                    if (backCamera && isMounted) {
                        setCurrentDevice(backCamera.deviceId);
                    } else if (frontCamera && isMounted) {
                        setCurrentDevice(frontCamera.deviceId);
                    } else if (isMounted) {
                        setCurrentDevice(videoDevices[0].deviceId);
                    }
                    setIsStable(true);
                } else {
                    setIsStable(true);
                }
            } catch (err) {
                if (onError) onError(err);
                setIsStable(true);
            }
        };
        
        setupCameras();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- isMounted, onError intentionally excluded
    }, [externalCameras, externalCameraReady]);
    
    // Check for flash support
    useEffect(() => {
        const checkFlashSupport = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { deviceId: currentDevice ? { exact: currentDevice } : undefined } 
                });
                const videoTrack = stream.getVideoTracks()[0];
                const capabilities = videoTrack.getCapabilities();
                
                if (capabilities.torch && isMounted) {
                    setHasFlash(true);
                }
                
                // Clean up
                stream.getTracks().forEach(track => track.stop());
            } catch (err) {
                // Flash not supported, fail silently
            }
        };
        
        if (currentDevice) {
            checkFlashSupport();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- isMounted ref excluded
    }, [currentDevice]);
    
    const handleScan = (detectedCodes) => {
        // Prevent processing if component is unmounted or already processing
        if (!isMounted || isProcessing) return;
        
        if (detectedCodes && detectedCodes.length > 0) {
            const firstCode = detectedCodes[0];
            const rawValue = firstCode.rawValue;
            
            // Defer callback to next tick so we don't trigger parent setState (re-render/unmount)
            // while the scanner library is still in its onFound handler (avoids "tracking canvas" error)
            queueMicrotask(() => {
                if (!mountedRef.current) return;
                if (onResult) {
                    onResult({ text: rawValue }, null);
                }
                setError(null);
            });
        }
    };
    
    const handleError = (err) => {
        // Don't process errors if component is unmounted
        if (!isMounted) return;
        
        let errorMessage = err.message || 'Scanning error occurred';
        
        // Handle specific error types
        if (err.name === 'OverconstrainedError') {
            errorMessage = 'Camera constraints not supported. Trying simpler setup...';
            
            // Auto-retry with simpler constraints if we haven't tried too many times
            if (retryCount < 2 && isMounted) {
                if (retryCount < 1) {
                    setRetryCount(prev => prev + 1);
                } else {
                    // Fallback: disable device selection entirely
                    setRetryCount(prev => prev + 1);
                    setCurrentDevice(null);
                }
                return; // Don't set error, try to recover
            }
            
            // If we get here, show a more helpful message
            errorMessage = 'Camera setup failed. Please check if another app is using the camera.';
        } else if (err.name === 'NotAllowedError') {
            errorMessage = 'Camera permission denied. Please allow camera access.';
        } else if (err.name === 'NotFoundError') {
            errorMessage = 'No camera found on this device.';
        }
        
        if (isMounted) {
            setError(errorMessage);
        }
        
        if (onError && isMounted) {
            onError(err);
        }
    };
    
    const switchCamera = () => {
        if (!isMounted || availableDevices.length < 2) {
            return;
        }
        
        const currentIndex = availableDevices.findIndex(device => device.deviceId === currentDevice);
        const nextIndex = (currentIndex + 1) % availableDevices.length;
        const nextDevice = availableDevices[nextIndex];
        
        if (isMounted) {
            setCurrentDevice(nextDevice.deviceId);
            setError(null); // Clear any previous errors
        }
    };
    
    const toggleFlash = async () => {
        if (!isMounted || !hasFlash) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { deviceId: currentDevice ? { exact: currentDevice } : undefined } 
            });
            const videoTrack = stream.getVideoTracks()[0];
            
            await videoTrack.applyConstraints({
                advanced: [{ torch: !isFlashOn }]
            });
            
            if (isMounted) {
                setIsFlashOn(!isFlashOn);
            }
            
            // Clean up
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            // Flash toggle failed, fail silently
        }
    };
    
    const retryCamera = () => {
        if (!isMounted) return;
        
        setError(null);
        setRetryCount(prev => prev + 1);
        
        // Reset to first available camera or no specific device
        if (availableDevices.length > 0) {
            setCurrentDevice(availableDevices[0].deviceId);
        } else {
            setCurrentDevice(null);
        }
    };
    
    // Build flexible constraints for the scanner
    const buildScannerConstraints = () => {
        let videoConstraints = {};
        
        // Ultra-conservative constraint strategy
        if (currentDevice && availableDevices.length > 1) {
            // Multiple cameras: use deviceId to select specific camera
            videoConstraints = {
                deviceId: { ideal: currentDevice }
            };
        } else if (availableDevices.length === 1) {
            // Single camera: use absolute minimal constraints - let browser handle everything
            videoConstraints = {}; // No constraints at all - just let browser use the only camera
        } else if (availableDevices.length > 1) {
            // Multiple cameras but no specific selection: minimal constraints with smart facingMode
            if (retryCount === 0) {
                const hasBackCamera = availableDevices.some(device => 
                    device.label.toLowerCase().includes('back') || 
                    device.label.toLowerCase().includes('environment') ||
                    device.label.toLowerCase().includes('rear')
                );
                
                if (hasBackCamera) {
                    videoConstraints = { facingMode: { ideal: 'environment' } };
                } else {
                    videoConstraints = { facingMode: { ideal: 'user' } };
                }
            } else {
                // Retry with no constraints
                videoConstraints = {};
            }
        } else {
            // No cameras detected yet: minimal fallback
            videoConstraints = {};
        }
        
        return {
            audio: false,
            video: videoConstraints
        };
    };
    
    const scannerConstraints = buildScannerConstraints();
    
    return (
        <div className={`modern-qr-scanner`} style={{ position: 'relative', ...containerStyle }}>
            {/* Camera Controls */}
            <div className="camera-controls" style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                {availableDevices.length > 1 && (
                    <button 
                        className="camera-switch-btn"
                        onClick={switchCamera}
                        title="Switch Camera"
                        style={{
                            background: 'rgba(23, 134, 255, 0.9)',
                            border: '1px solid rgba(23, 134, 255, 0.6)',
                            borderRadius: '8px',
                            color: 'white',
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        <FaSyncAlt />
                    </button>
                )}
                
                {hasFlash && (
                    <button 
                        className="flash-toggle-btn"
                        onClick={toggleFlash}
                        title={`Turn Flash ${isFlashOn ? 'Off' : 'On'}`}
                        style={{
                            background: isFlashOn ? 'rgba(255, 193, 7, 0.9)' : 'rgba(108, 117, 125, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '8px',
                            color: 'white',
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        <FaBolt />
                    </button>
                )}
            </div>
            

            
            {/* The Modern Scanner */}
            {!isProcessing && isStable ? (
                <Scanner
                    key={`modern-scanner-${currentDevice}-${cameraKey}`}
                    onScan={handleScan}
                    onError={handleError}
                    constraints={scannerConstraints}
                    paused={isProcessing || !isMounted}
                    allowMultiple={false}
                    scanDelay={300}
                    styles={{
                        container: {
                            width: '100%',
                            height: '100%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            ...videoStyle
                        }
                    }}
                    components={{
                        finder: true,
                        torch: false, // We handle this manually
                        zoom: false,
                        onOff: false
                    }}
                />
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '280px',
                    background: '#1a1a1a',
                    borderRadius: '12px',
                    color: '#e5e5e5'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <FaCamera size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <div>{isProcessing ? 'Processing...' : 'Initializing camera...'}</div>
                    </div>
                </div>
            )}
            
            {/* Error Display */}
            {error && (
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    background: 'rgba(220, 53, 69, 0.9)',
                    color: 'white',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <FaExclamationTriangle />
                        {error}
                    </div>
                    {retryCount < 3 && (
                        <button 
                            onClick={retryCamera}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '4px',
                                color: 'white',
                                padding: '0.25rem 0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                width: '100%'
                            }}
                        >
                            🔄 Try Again ({3 - retryCount} attempts left)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ModernQRScanner; 