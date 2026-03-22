import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ModernQRScanner from './ModernQRScanner';
import { Oval } from 'react-loading-icons';
import { FaCheck, FaQrcode, FaKey, FaSyncAlt } from 'react-icons/fa';
import '../style/singleQRUnlock.css';

const SingleQRUnlock = ({ 
    metadata,
    numOfQRsScanned,
    numOfQRKEYSsScanned,
    scanType,
    isProcessing,
    scannedKeys,
    onScanResult,
    cameraManager,
    onManualEntry
}) => {
    const totalVaultQRs = metadata ? (metadata.data ? 1 : (metadata.qrcodes || 1)) : 1;

    const getScanInstruction = () => {
        if (scanType === 'vault') {
            if (totalVaultQRs > 1 && numOfQRsScanned > 0) {
                return (
                    <span>
                        <strong>Scan vault QR {numOfQRsScanned + 1} of {totalVaultQRs}</strong>
                    </span>
                );
            }
            return (
                <span>
                    <strong>Scan your vault QR code</strong>
                </span>
            );
        } else {
            const keysScanned = numOfQRKEYSsScanned;
            const totalKeysNeeded = metadata.threshold;
            const keysRemaining = totalKeysNeeded - keysScanned;
            
            if (keysScanned === 0) {
                return (
                    <span>
                        <strong>Scan key 1 of {totalKeysNeeded}</strong>
                    </span>
                );
            } else if (keysRemaining > 0) {
                return (
                    <span>
                        <strong>Scan key {keysScanned + 1} of {totalKeysNeeded}</strong> ({keysRemaining} more needed)
                    </span>
                );
            } else {
                return (
                    <span>
                        <strong>All keys scanned!</strong> Unlocking vault...
                    </span>
                );
            }
        }
    };

        return (
        <div className="scanning-content single-qr-mode">
            {/* Mobile-first: Instruction bar above camera */}
            <div className="scan-instruction-mobile d-block d-md-none">
                <div className="current-action">
                    <Oval stroke={'#1786ff'} strokeWidth={15} className={'loading'} />
                    {getScanInstruction()}
                </div>
            </div>

            {/* Scanner Section */}
            <Row className="scanner-row">
                <Col lg={5} md={6} xs={12} className="scanner-column">
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
                                key={`qr-scanner-single-${cameraManager.cameraFacing}-${cameraManager.cameraKey || 0}`}
                                onResult={(result, error) => onScanResult(result?.text, error)}
                                constraints={cameraManager.getCameraConfig()}
                                containerStyle={{
                                    margin: 0,
                                    padding: 0,
                                    height: '250px', // Fixed mobile-friendly height
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
                                externalCameras={cameraManager.availableCameras}
                                externalCameraReady={cameraManager.isInitialized}
                            />
                        )}
                    </div>
                </Col>

                <Col lg={7} md={6} className="progress-column-desktop d-none d-md-block">
                     {/* Desktop instruction bar - hidden on mobile */}
                     <div className="current-action">
                         <Oval stroke={'#1786ff'} strokeWidth={15} className={'loading'} />
                         {getScanInstruction()}
                     </div>
                     
                     {/* Desktop Progress Display */}
                     {metadata && (
                         <div className="vault-progress-simple">
                             <div className="vault-name">
                                 <strong>{metadata.name}</strong>
                             </div>
                             
                             {/* Vault Status */}
                             <div className="progress-item-row">
                                 {totalVaultQRs === 1 ? (
                                     <div className={`progress-item ${numOfQRsScanned > 0 ? 'completed' : 'pending'}`}>
                                         {numOfQRsScanned > 0 ? <FaCheck className="check-icon" /> : <FaQrcode className="pending-icon" />}
                                         <span>Vault Data</span>
                                     </div>
                                 ) : (
                                     Array.from({length: totalVaultQRs}, (_, i) => (
                                         <div key={i} className={`progress-item ${numOfQRsScanned > i ? 'completed' : 'pending'}`}>
                                             {numOfQRsScanned > i ? <FaCheck className="check-icon" /> : <FaQrcode className="pending-icon" />}
                                             <span>Vault QR {i + 1}</span>
                                         </div>
                                     ))
                                 )}
                             </div>

                             {/* Keys Grid */}
                             <div className="keys-section">
                                 <div className="keys-header">
                                     <FaKey className="section-icon" />
                                     <span>Keys ({numOfQRKEYSsScanned}/{metadata.threshold})</span>
                                 </div>

                                 <div className="keys-grid-simple">
                                     {metadata.keys && metadata.keys.map((keyAlias, index) => {
                                         const isScanned = scannedKeys.includes(keyAlias);
                                         return (
                                             <div
                                                 key={index}
                                                 className={`key-item-simple ${isScanned ? 'completed' : ''}`}
                                             >
                                                 {isScanned ? <FaCheck className="check-icon" /> : <FaKey className="key-icon" />}
                                                 <span className="key-alias">{keyAlias}</span>
                                             </div>
                                         );
                                     })}
                                 </div>

                                 <div className="keys-note-simple">
                                     Scan any {metadata.threshold} of {metadata.keys.length} keys
                                     {numOfQRKEYSsScanned > 0 && (
                                         <span> • {metadata.threshold - numOfQRKEYSsScanned} more needed</span>
                                     )}
                                 </div>
                             </div>
                         </div>
                     )}
                 </Col>
             </Row>

             {/* Mobile Progress Display - Below camera */}
             <div className="mobile-progress d-block d-md-none">
                 {metadata && (
                     <div className="vault-progress-simple">
                         <div className="vault-name">
                             <strong>{metadata.name}</strong>
                         </div>

                         {/* Vault Status */}
                         <div className="progress-item-row">
                             {totalVaultQRs === 1 ? (
                                 <div className={`progress-item ${numOfQRsScanned > 0 ? 'completed' : 'pending'}`}>
                                     {numOfQRsScanned > 0 ? <FaCheck className="check-icon" /> : <FaQrcode className="pending-icon" />}
                                     <span>Vault Data</span>
                                 </div>
                             ) : (
                                 Array.from({length: totalVaultQRs}, (_, i) => (
                                     <div key={i} className={`progress-item ${numOfQRsScanned > i ? 'completed' : 'pending'}`}>
                                         {numOfQRsScanned > i ? <FaCheck className="check-icon" /> : <FaQrcode className="pending-icon" />}
                                         <span>Vault QR {i + 1}</span>
                                     </div>
                                 ))
                             )}
                         </div>

                         {/* Keys Grid */}
                         <div className="keys-section">
                             <div className="keys-header">
                                 <FaKey className="section-icon" />
                                 <span>Keys ({numOfQRKEYSsScanned}/{metadata.threshold})</span>
                             </div>

                             <div className="keys-grid-simple">
                                 {metadata.keys && metadata.keys.map((keyAlias, index) => {
                                     const isScanned = scannedKeys.includes(keyAlias);
                                     return (
                                         <div
                                             key={index}
                                             className={`key-item-simple ${isScanned ? 'completed' : ''}`}
                                         >
                                             {isScanned ? <FaCheck className="check-icon" /> : <FaKey className="key-icon" />}
                                             <span className="key-alias">{keyAlias}</span>
                                         </div>
                                     );
                                 })}
                             </div>

                             <div className="keys-note-simple">
                                 Scan any {metadata.threshold} of {metadata.keys.length} keys
                                 {numOfQRKEYSsScanned > 0 && (
                                     <span> • {metadata.threshold - numOfQRKEYSsScanned} more needed</span>
                                 )}
                             </div>
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export default SingleQRUnlock; 