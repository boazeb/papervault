import React from 'react';
import { AiOutlineQrcode } from 'react-icons/ai';
import { ImKey } from 'react-icons/im';
import { FaCheck } from 'react-icons/fa';

const VaultMetadata = ({ metadata, VAULT_VERSIONS, getClassType, getKeyClass, numOfQRsScanned, numOfQRKEYSsScanned, scanType }) => {
    
    // Show skeleton while waiting for metadata
    if (!metadata) {
        return (
            <div className="vault-dashboard skeleton">
                <div className="dashboard-header">
                    <div className="vault-info">
                        <div className="vault-details">
                            <div className="skeleton-text skeleton-title"></div>
                            <div className="skeleton-text skeleton-subtitle"></div>
                        </div>
                    </div>
                </div>

                {/* Vault Data Skeleton - Unknown structure */}
                <div className="progress-section">
                    <div className="section-header">
                        <div className="section-title">
                            <AiOutlineQrcode className="section-icon skeleton-icon" />
                            <h5>Vault Data</h5>
                            <div className="section-progress">
                                <div className="mini-progress-bar">
                                    <div className="mini-progress-fill skeleton-progress"></div>
                                </div>
                                <span className="mini-progress-text">? / ?</span>
                            </div>
                        </div>
                    </div>
                    <div className="skeleton-unknown-content">
                        <div className="unknown-message">
                            <span className="unknown-icon">📋</span>
                            <p>Vault structure unknown until metadata is scanned</p>
                        </div>
                    </div>
                </div>

                {/* Keys Skeleton - Unknown structure */}
                <div className="progress-section">
                    <div className="section-header">
                        <div className="section-title">
                            <ImKey className="section-icon skeleton-icon" />
                            <h5>Unlock Keys</h5>
                            <div className="section-progress">
                                <div className="mini-progress-bar">
                                    <div className="mini-progress-fill skeleton-progress"></div>
                                </div>
                                <span className="mini-progress-text">? / ?</span>
                            </div>
                        </div>
                    </div>
                    <div className="skeleton-unknown-content">
                        <div className="unknown-message">
                            <span className="unknown-icon">🔑</span>
                            <p>Key requirements unknown until metadata is scanned</p>
                        </div>
                    </div>
                </div>

                {/* Technical Details Skeleton */}
                <div className="technical-details">
                    <h6>Technical Information</h6>
                    <div className="skeleton-unknown-content">
                        <div className="unknown-message">
                            <span className="unknown-icon">⚙️</span>
                            <p>Technical details will be available after metadata scan</p>
                        </div>
                    </div>
                </div>

                <div className="skeleton-scanning-notice">
                    <p>📡 Scan the <strong>metadata QR code</strong> to discover vault structure...</p>
                </div>
            </div>
        );
    }
    
    const vaultProgress = Math.round(((numOfQRsScanned) / metadata.qrcodes) * 100);
    const keyProgress = Math.round((numOfQRKEYSsScanned / metadata.threshold) * 100);

    return (
        <div className="vault-dashboard">
            {/* Header with overall progress */}
            <div className="dashboard-header">
                <div className="vault-info">
                    
                    <div className="vault-details">
                        <h4>{metadata.name}</h4>
                        <p>{metadata.threshold} of {metadata.shares} keys required</p>
                    </div>
                </div>
                
            </div>

            {/* Vault Data Section */}
            <div className="progress-section">
                <div className="section-header">
                    <div className="section-title">
                        <AiOutlineQrcode className="section-icon" />
                        <h5>Vault Data</h5>
                        <div className="section-progress">
                            <div className="mini-progress-bar">
                                <div className="mini-progress-fill" style={{width: `${vaultProgress}%`}}></div>
                            </div>
                            <span className="mini-progress-text">{numOfQRsScanned}/{metadata.qrcodes}</span>
                        </div>
                    </div>
                </div>
                <div className="progress-grid">
                    {[...Array(metadata.qrcodes)].map((_, index) => (
                        <div className={`progress-item ${getClassType(index, 'vault')} ${scanType === 'vault' && index === numOfQRsScanned ? 'scanning' : ''}`} key={'vault'+index}>
                            <div className="item-status">
                                {index < numOfQRsScanned ? <FaCheck /> : <span className="item-number">{index + 1}</span>}
                            </div>
                            <div className="item-info">
                                <span className="item-name">{index === 0 ? 'Metadata' : `Shard #${index}`}</span>
                                {index < numOfQRsScanned && <span className="item-status-text">Scanned</span>}
                                {scanType === 'vault' && index === numOfQRsScanned && <span className="item-status-text scanning-text">Scanning...</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Keys Section */}
            <div className="progress-section">
                <div className="section-header">
                    <div className="section-title">
                        <ImKey className="section-icon" />
                        <h5>Unlock Keys</h5>
                        <div className="section-progress">
                            <div className="mini-progress-bar">
                                <div className="mini-progress-fill" style={{width: `${keyProgress}%`}}></div>
                            </div>
                            <span className="mini-progress-text">{numOfQRKEYSsScanned}/{metadata.threshold}</span>
                        </div>
                    </div>
                </div>
                <div className="progress-grid">
                    {metadata.keys && [...Array(metadata.shares)].map((_, index) => {
                        const keyName = metadata.keys[index];
                        const isScanned = keyName && getKeyClass(keyName).includes('unlockrowItemSuccess');
                        const isAvailableToScan = scanType === 'key' && !isScanned;
                        
                        return (
                            <div className={`progress-item ${getKeyClass(keyName)} ${isAvailableToScan ? 'scanning' : ''}`} key={'key'+index}>
                                <div className="item-status">
                                    {isScanned ? <FaCheck /> : <span className="item-number">{index + 1}</span>}
                                </div>
                                <div className="item-info">
                                    <span className="item-name">{keyName}</span>
                                    {isScanned && <span className="item-status-text">Scanned</span>}
                                    {isAvailableToScan && <span className="item-status-text scanning-text">Ready to scan</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Technical Details */}
            <div className="technical-details">
                <h6>Technical Information</h6>
                <div className="tech-grid">
                    <div className="tech-item">
                        <span className="tech-label">Version</span>
                        <span className="tech-value">{metadata.version || '1'}</span>
                    </div>
                    {VAULT_VERSIONS[metadata.version || '1'] && (
                        <>
                            <div className="tech-item">
                                <span className="tech-label">Encryption</span>
                                <span className="tech-value">{VAULT_VERSIONS[metadata.version || '1'].algorithm}</span>
                            </div>
                            <div className="tech-item">
                                <span className="tech-label">Key Derivation</span>
                                <span className="tech-value">{VAULT_VERSIONS[metadata.version || '1'].kdf}</span>
                            </div>
                        </>
                    )}
                    <div className="tech-item">
                        <span className="tech-label">Cipher IV</span>
                        <span className="tech-value">
                            {metadata.cipherIV
                                ? `${metadata.cipherIV.slice(0, 3)}...${metadata.cipherIV.slice(-3)}`
                                : ''}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VaultMetadata; 