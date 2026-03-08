import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { EncryptionService } from '../services/EncryptionService';
import { VAULT_VERSIONS } from '../config/vaultConfig';
import { LIMITS } from '../config/limits';
import '../style/index.css';
import '../style/createPage.css';
import '../style/forms.css';
import '../style/unlockPage.css';
import Navbar from '../components/NavbarTop';
import PreparationStep from '../components/PreparationStep';
import UnlockedVault from '../components/UnlockedVault';
import { useCameraManager } from '../hooks/useCameraManager';

// NEW: Import format-specific components
import SingleQRUnlock from '../components/SingleQRUnlock';
import LegacyMultiQRUnlock from '../components/LegacyMultiQRUnlock';

// Moved camera logic to useCameraManager hook

function UnlockPage() {
    const navigate = useNavigate();
    const [, setShowScanner] = useState(false);
    const [cipherData, setCipherData] = useState('');
    const [metadata, setMetadata] = useState();
    const [unlockShares, setUnlockShares] = useState([]);
    const [scanType, setScanType] = useState('vault');
    const [numOfQRsScanned, setNumOfQRsScanned] = useState(0);
    const [numOfQRKEYSsScanned, setNumOfQRKEYSsScanned] = useState(0);
    const [wizardStep, setWizardStep] = useState(1);
    const [unlocked, setUnlocked] = useState(false);
    const [decryptionResult, setDecryptionResult] = useState();
    const [isProcessing, setIsProcessing] = useState();
    const [scannedKeys, setScannedKeys] = useState([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    // Camera management via custom hook
    const cameraManager = useCameraManager();

    useEffect(() => {
        const handleOnline = () => setIsOnline(navigator.onLine);
        const handleOffline = () => setIsOnline(navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            cleanupSensitiveData();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(()=>{
        if (!metadata) return;
        
        // NEW: Handle both single QR and legacy multi-QR formats
        const totalVaultQRs = metadata.data ? 1 : metadata.qrcodes;
        
        if (numOfQRsScanned >= totalVaultQRs) {
            // Scanned vault QRs - transitioning to key scanning
            setScanType('key');
        }
    }, [numOfQRsScanned, metadata]);

    useEffect(() => {
        if (!metadata) return;
        if (numOfQRKEYSsScanned >= metadata.threshold) {
            unlockVault();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- unlockVault and metadata intentionally excluded to avoid loops
    }, [numOfQRKEYSsScanned]);

    // Auto-scroll to top when wizard step changes
    useEffect(() => {
        // Only scroll if user has scrolled down (more than 100px from top)
        if (window.scrollY > 100) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }, [wizardStep]);

    const scannedVault = (data) => {
        if (typeof data !== 'string' || data.length > LIMITS.MAX_QR_PAYLOAD_BYTES) {
            alert('QR code data too large. Please scan a valid vault QR code.');
            setTimeout(() => setIsProcessing(false), 300);
            return;
        }

        let jsonObject;
        try {
            jsonObject = JSON.parse(data);
        } catch (error) {
            alert('Invalid vault QR code format. Please scan a valid vault QR code.');
            setTimeout(() => setIsProcessing(false), 300);
            return;
        }

        if ((numOfQRsScanned===0) && (jsonObject.id !==1)) {
            alert ('please scan the vault QR from your backup');
            setTimeout(() => setIsProcessing(false), 300);
            return;
        }

        // NEW: Prevent duplicate vault scanning
        if (metadata && jsonObject.id === 1) {
            alert('Vault already scanned. Please scan key QR codes instead.');
            setTimeout(() => setIsProcessing(false), 300);
            return;
        }

        if (jsonObject.id===1) {
            // Version validation
            if (!jsonObject.version) {
                // Assume version 1 for backward compatibility
                jsonObject.version = '1';
            } else if (!VAULT_VERSIONS[jsonObject.version]) {
                alert('This vault was created with a newer version of PaperVault.xyz. Please update your software.');
               // setIsProcessing(false);
               // return;
            }
            
            setMetadata(jsonObject);
            
            // NEW: Check if this is a single QR code format (has data field)
            if (jsonObject.data) {
                            // Detected new single QR format - setting cipher data immediately
                setCipherData(jsonObject.data);
                // For single QR format, we've scanned all vault data
                setNumOfQRsScanned(1);
                // Skip to key scanning phase
                setScanType('key');
            } else {
                            // Detected legacy multi-QR format - expecting data shards
                // Legacy format - expect separate data shards
                setNumOfQRsScanned(1);
            }
        } else {
            // Legacy format: Handle data shards
            if (jsonObject.id !== (numOfQRsScanned+1)) {
                alert('please scan shard #' + (numOfQRsScanned));
                setTimeout(() => setIsProcessing(false), 300);
                return;
            }
            setCipherData(cipherData+jsonObject.data);
            setNumOfQRsScanned(jsonObject.id);
        }
        
        setTimeout(() => setIsProcessing(false), 300);
    };

    const scannedKey= (data) => {
        // NEW: Validate key data structure
        if (!data || !data.key || !data.ident) {
            alert('Invalid key QR code. Please scan a valid key.');
            setTimeout(() => setIsProcessing(false), 300);
            return;
        }

        // Check for duplicate key shares
        if (unlockShares.includes(data.key)) {
            alert('This key has already been scanned.');
            setTimeout(() => setIsProcessing(false), 300);
            return;
        }

        // Check for duplicate key identifiers
        if (scannedKeys.includes(data.ident)) {
            alert('This key has already been scanned.');
            setTimeout(() => setIsProcessing(false), 300);
            return;
        }

        // Fix: Use spread operator to create new arrays instead of mutating existing ones
        const newUnlockShares = [...unlockShares, data.key];
        setUnlockShares(newUnlockShares);

        const newScannedKeys = [...scannedKeys, data.ident];
        setScannedKeys(newScannedKeys);
        
        // Key scanned successfully
        
        setNumOfQRKEYSsScanned(numOfQRKEYSsScanned+1);
        setTimeout(() => setIsProcessing(false), 300);
    }


    const scannedSomething = (data, error) => {
        if (error) {
            // Only handle actual camera/permission errors, not scanning errors
            if (error.name === 'NotAllowedError' || 
                error.name === 'NotFoundError' || 
                error.name === 'NotReadableError' || 
                error.name === 'OverconstrainedError') {
                
                // Camera error detected
                
                if (error.name === 'NotAllowedError') {
                    cameraManager.setCameraError('Camera permission denied. Please allow camera access and refresh the page.');
                } else if (error.name === 'NotFoundError') {
                    cameraManager.setCameraError('No camera found. Please check your device camera.');
                } else if (error.name === 'NotReadableError') {
                    cameraManager.setCameraError('Camera is already in use by another application.');
                } else if (error.name === 'OverconstrainedError') {
                    cameraManager.setCameraError('Camera constraints cannot be satisfied.');
                }
            }
            // Ignore other errors (like "No QR code found" - these are normal)
            return;
        }
        
        // Clear any previous camera errors when we get successful data
        cameraManager.setCameraError(null);
        
        if (isProcessing) return;
        setIsProcessing(true);

        if (typeof data !== 'string' || data.length > LIMITS.MAX_QR_PAYLOAD_BYTES) {
            alert('QR code data too large. Please scan a valid ' + (scanType === 'vault' ? 'vault' : 'key') + ' QR code.');
            setTimeout(() => setIsProcessing(false), 300);
            return;
        }

        try {
            if (scanType==='vault') {
                scannedVault(data);
            } else if (scanType==='key'){
                const keyData = JSON.parse(data);
                scannedKey(keyData);
            }
        } catch (error) {
            alert('Invalid QR code format. Please scan a valid ' + (scanType === 'vault' ? 'vault' : 'key') + ' QR code.');
            setTimeout(() => setIsProcessing(false), 300);
        }
    };

    // switchCamera function moved to useCameraManager hook

    const unlockVault = ()=> {
        // NEW: Comprehensive validation before attempting decryption
        if (!metadata) {
            alert('Missing vault metadata. Please scan vault QR first.');
            return;
        }

        if (!cipherData || cipherData.length === 0) {
            alert('Missing vault data. Please scan vault QR first.');
            return;
        }

        if (!metadata.cipherIV) {
            alert('Missing encryption parameters. Please scan vault QR again.');
            return;
        }

        if (!unlockShares || unlockShares.length === 0) {
            alert('No unlock keys found. Please scan key QR codes.');
            return;
        }

        if (unlockShares.length < metadata.threshold) {
            const needed = metadata.threshold - unlockShares.length;
            alert(`Need ${needed} more key${needed > 1 ? 's' : ''}. You have ${unlockShares.length} of ${metadata.threshold} required keys.`);
            return;
        }

        // All validations passed - proceed with decryption
        const getCipherKey = () => {
            if (metadata.threshold === 1) {
                if (!unlockShares[0]) {
                    return Promise.reject(new Error('Invalid unlock key data. Please scan key QR again.'));
                }
                // V2 with one share: the share is a shamir share, combine to get key. V1: the single "share" is the raw key.
                if (metadata.version === '2') {
                    return EncryptionService.combineShares([unlockShares[0]], metadata.version);
                }
                return Promise.resolve(unlockShares[0]);
            }
            return EncryptionService.combineShares(unlockShares, metadata.version);
        };

        getCipherKey().then((cipherKey) => {
            if (!cipherKey) {
                alert('Failed to combine unlock keys. Please scan key QR codes again.');
                return;
            }
            return EncryptionService.decrypt(
                cipherData,
                cipherKey,
                metadata.cipherIV,
                metadata.version
            ).then((decryptionResult) => {
                setUnlocked(true);
                setDecryptionResult(decryptionResult);
            });
        }).catch(error => {
            alert((error.message || 'Decryption failed') + '\n\nPlease verify you scanned the correct vault and key QR codes.');
            setUnlocked(false);
        });
    };


    const getClassType = (index, rowType) => {
        let returnClass = ' unlockrowItem ';
        if (scanType==='vault' && rowType==='vault') {
            returnClass = returnClass + ' unlockrowItemVault ';
            if (numOfQRsScanned-1>=index) {
                returnClass = returnClass + ' unlockrowItemSuccess ';
                return returnClass;
            }
            if (index===numOfQRsScanned) {
                returnClass = returnClass + ' activeQR ';
                return returnClass;
            }
        }

        if (scanType==='key' && rowType==='key') {
            let returnClass = ' unlockrowItem ';
            returnClass = returnClass + ' unlockrowItemKey ';
            if (scannedKeys.includes(metadata.keys[index].alias)) {
                return returnClass + ' unlockrowItemSuccess ';
            }
        }

        if (scanType==='key' && rowType==='vault') {
            returnClass = returnClass + ' unlockrowItemSuccess ';
        }

        return returnClass;
    };

    const getKeyClass = (keyname) => {
        let returnClass = ' unlockrowItem ';
        if (scannedKeys.includes(keyname)) {
            return returnClass + ' unlockrowItemSuccess ';
        }
        if (scanType === 'key' && !scannedKeys.includes(keyname)) {
            return returnClass + ' activeQR ';
        }
        return returnClass;
    }

    const cleanupSensitiveData = () => {
        // Clear application state so the app doesn't keep showing or reusing secrets.
        // For full clearing from memory, the user should close the tab or browser (see UnlockedVault copy).
        setDecryptionResult(null);
        setUnlockShares([]);
        setCipherData('');
        setMetadata(null);
        setScannedKeys([]);
        setNumOfQRsScanned(0);
        setNumOfQRKEYSsScanned(0);
    };

    // NEW: Vault format detection and manual override
    const [forceFormat, setForceFormat] = useState(null); // 'single' or 'legacy'
    
    const getVaultFormat = () => {
        // If user manually selected a format, use that
        if (forceFormat) return forceFormat;
        
        // If no metadata yet, default to single QR format (v2)
        if (!metadata) return 'single';
        
        // Once metadata is scanned, detect format automatically
        return metadata.data ? 'single' : 'legacy';
    };

    const isUsingUnifiedComponent = () => {
        return getVaultFormat() === 'single';
    };

    if (unlocked) {
        return (
            <Layout>
                <Navbar />
                <div className={'pageWrapper'}>
                    <div className="unlock-layout">
                        <div className="unlock-main-content">
                            <div className="content-container">
                                <UnlockedVault 
                                    decryptionResult={decryptionResult}
                                    onClose={() => {
                                        cleanupSensitiveData();
                                        navigate('/');
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        )
    }



    return (
        <Layout>
            <Navbar loggedIn/>
            <div>
                <div className="unlock-layout">
                    
                    
                    {/* Main Content Area */}
                    <div className="unlock-main-content">
                        <div className={`content-container ${wizardStep !== 1 ? 'scanning-mode' : ''}`}>
                            {wizardStep === 1 ? (
                                <PreparationStep 
                                    isOnline={isOnline}
                                    onContinue={() => {
                                        setShowScanner(true);
                                        setWizardStep(wizardStep + 1);
                                        // Initialize cameras when scanning starts
                                        cameraManager.initializeCameras();
                                    }}
                                />
                            ) : wizardStep === 2 ? (
                                <div className="scanning-wrapper">
                                    {/* NEW: Component routing based on vault format */}
                                    {isUsingUnifiedComponent() ? (
                                        <SingleQRUnlock
                                            metadata={metadata}
                                            numOfQRsScanned={numOfQRsScanned}
                                            numOfQRKEYSsScanned={numOfQRKEYSsScanned}
                                            scanType={scanType}
                                            isProcessing={isProcessing}
                                            scannedKeys={scannedKeys}
                                            onScanResult={scannedSomething}
                                            cameraManager={cameraManager}
                                        />
                                    ) : (
                                        <LegacyMultiQRUnlock
                                            metadata={metadata}
                                            numOfQRsScanned={numOfQRsScanned}
                                            numOfQRKEYSsScanned={numOfQRKEYSsScanned}
                                            scanType={scanType}
                                            isProcessing={isProcessing}
                                            scannedKeys={scannedKeys}
                                            onScanResult={scannedSomething}
                                            getClassType={getClassType}
                                            getKeyClass={getKeyClass}
                                            VAULT_VERSIONS={VAULT_VERSIONS}
                                            cameraManager={cameraManager}
                                        />
                                    )}
                                </div>
                            ) : null}

                            <div className="content-footer">
                                {/* Format Selection - In footer during scanning */}
                                {wizardStep === 2 && !metadata && (
                                    <div className="format-selection-footer">
                                        <span className="format-text">
                                            Vault format: {getVaultFormat() === 'single' ? 'V2' : 'V1 (legacy format)'} • 
                                        </span>
                                        <button 
                                            className="format-link"
                                            onClick={() => setForceFormat(getVaultFormat() === 'single' ? 'legacy' : 'single')}
                                        >
                                            Switch to {getVaultFormat() === 'single' ? 'V1 (legacy format)' : 'V2'}
                                        </button>
                                    </div>
                                )}
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    )

}

export default UnlockPage;



