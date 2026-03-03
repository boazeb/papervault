import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ModernQRScanner from './ModernQRScanner';
import { Oval } from 'react-loading-icons';
import { FaExclamationTriangle, FaSyncAlt } from 'react-icons/fa';
import VaultMetadata from './VaultMetadata';

const LegacyMultiQRUnlock = ({
    metadata,
    numOfQRsScanned,
    numOfQRKEYSsScanned,
    scanType,
    isProcessing,
    scannedKeys,
    onScanResult,
    getClassType,
    getKeyClass,
    VAULT_VERSIONS,
    cameraManager
}) => {
    // Get camera constraints based on facing mode
    const getCameraConfig = () => {
        return cameraManager.getCameraConfig();
    };

    return (
        <div className="scanning-content">
            <Row className="scanner-row">
                <Col md={4} className="scanner-column">
                    <div className="scanner-overlay">
                        {/* Camera Controls */}
                        <div className="camera-controls">
                            <button 
                                className="camera-switch-btn"
                                onClick={cameraManager.switchCamera}
                                title={`Switch to ${cameraManager.cameraFacing === 'back' ? 'front' : 'back'} camera`}
                            >
                                <FaSyncAlt />
                            </button>
                        </div>
                        
                        {isProcessing ? (
                            <div className="scanner-processing">
                                <Oval stroke={'#1786ff'} strokeWidth={15} />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <ModernQRScanner
                                key={`qr-scanner-legacy-${cameraManager.cameraFacing}-${cameraManager.cameraKey || 0}`}
                                onResult={(result, error) => onScanResult(result?.text, error)}
                                constraints={getCameraConfig()}
                                containerStyle={{
                                    margin: 0,
                                    padding: 0,
                                    height: '280px',
                                    width: '100%',
                                    borderRadius: 12,
                                }}
                                videoStyle={{
                                    height: '100%',
                                    width: '100%',
                                    margin: 0,
                                    padding: 0,
                                    objectFit: 'cover',
                                    borderRadius: 12,
                                }}
                                cameraKey={cameraManager.cameraKey}
                                isProcessing={isProcessing}
                            />
                        )}
                    </div>
                </Col>
                
                <Col md={8}>
                    <div className="current-action">
                        <Oval stroke={'#1786ff'} strokeWidth={15} className={'loading'} />
                        {scanType === 'vault' ?
                            <span>
                                {numOfQRsScanned === 0 ?
                                    <span>Scan the <b>metadata</b> QR on your vault</span>
                                    :
                                    <span>Scan <b>shard #{numOfQRsScanned}</b> from your vault</span>
                                }
                            </span>
                            :
                            <span>Scan key #{numOfQRKEYSsScanned + 1} of {metadata?.threshold} required</span>
                        }
                    </div>
                
                    <div className="scan-status-section">
                        <VaultMetadata 
                            metadata={metadata} 
                            VAULT_VERSIONS={VAULT_VERSIONS}
                            getClassType={getClassType}
                            getKeyClass={getKeyClass}
                            numOfQRsScanned={numOfQRsScanned}
                            numOfQRKEYSsScanned={numOfQRKEYSsScanned}
                            scanType={scanType}
                        />
                    </div>
                </Col>
            </Row>

            {cameraManager.cameraError && (
                <div className="alert alert-danger mt-3">
                    <FaExclamationTriangle className="me-2" />
                    {cameraManager.cameraError}
                </div>
            )}
            
            {/* Temporary debug info for mobile testing */}
            {cameraManager.debugInfo && (
                <div className="alert alert-info mt-3" style={{ fontSize: '12px', maxHeight: '60px', overflow: 'auto' }}>
                    <strong>Debug:</strong> {cameraManager.debugInfo}
                </div>
            )}
        </div>
    );
};

export default LegacyMultiQRUnlock; 