import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaLock, FaCheckCircle, FaPrint, FaDownload, FaShieldAlt, FaExclamationTriangle, FaArrowRight } from 'react-icons/fa';
import PDFVaultBackup from './PDFVaultBackup';
import PDFKeyBackup from './PDFKeyBackup';
import { clearProSession } from '../config/limits';

const VaultDownloadSection = ({
    hasPressedVaultPrint,
    hasPressedKeyPrint,
    doPrintVault,
    doPrintKeys,
    downloadVault,
    downloadKey,
    refBackupVaultPDF,
    refBackupKeyPDF,
    vaultIdent,
    cipherText,
    shares,
    consensus,
    vaultName,
    description,
    cipherIV,
    createdTimestamp,
    keyAliasArray,
    maxLengthPerQRCode,
    vaultColors
}) => {
    const [vaultDownloaded, setVaultDownloaded] = useState(false);
    const [keysDownloaded, setKeysDownloaded] = useState(new Set());
    const [, setShowDownloadWarning] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [preferredMethod, setPreferredMethod] = useState(null); // 'print' or 'download'
    const [allPrinted, setAllPrinted] = useState(false);

    // Clear pro session when vault creation is complete
    useEffect(() => {
        clearProSession();
    }, []);

    // Auto-scroll to top when step changes
    useEffect(() => {
        // Only scroll if user has scrolled down (more than 100px from top)
        if (window.scrollY > 100) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }, [currentStep]);

    const handleVaultDownload = () => {
        downloadVault();
        setVaultDownloaded(true);
        setShowDownloadWarning(true);
    };

    const handleKeyDownload = (share, index) => {
        downloadKey(share, index);
        setKeysDownloaded(prev => new Set([...prev, index]));
        setShowDownloadWarning(true);
    };

    const handlePrintAll = () => {
        // Print the combined component that includes both vault and keys
        doPrintVault();
        setAllPrinted(true);
    };

    const goBackToStep = (stepNumber) => {
        setCurrentStep(stepNumber);
        if (stepNumber === 1) {
            setPreferredMethod(null);
        }
    };

    const printCompleted = allPrinted || (hasPressedVaultPrint && hasPressedKeyPrint);
    const downloadCompleted = vaultDownloaded && keysDownloaded.size === shares.length;
    const allCompleted = (preferredMethod === 'print' && printCompleted) || (preferredMethod === 'download' && downloadCompleted);

    // Update the method selection to scroll after state change
    const handleMethodSelection = (method) => {
        setPreferredMethod(method);
        if (currentStep === 1) {
            setCurrentStep(2);
            // The useEffect above will handle the scroll
        }
    };

    const renderStepIndicator = () => (
        <div className="vault-wizard-progress">
            <div className="wizard-steps">
                {[
                    { num: 1, label: 'Select method', completed: !!preferredMethod && currentStep > 1 },
                    { num: 2, label: preferredMethod === 'print' ? 'Print Files' : 'Download Files', completed: allCompleted && currentStep > 2 },
                    { num: 3, label: 'Test', completed: currentStep > 3 }
                ].map((step, index) => (
                    <div key={step.num} className={`wizard-step ${step.completed ? 'completed' : ''} ${currentStep === step.num ? 'active' : ''}`}>
                        <div className="step-circle">
                            {step.completed ? <FaCheckCircle /> : step.num}
                        </div>
                        <span className="step-label">{step.label}</span>
                        {index < 2 && <div className="step-connector"></div>}
                    </div>
                ))}
            </div>
        </div>
    );

    // eslint-disable-next-line no-unused-vars -- reserved for future notice banner
    const _renderImportantNotice = () => (
        <div className="important-notice-banner">
            <div className="notice-icon">
                <FaLock />
            </div>
            <div className="notice-content">
                <h4>📋 Important: Save Your Documents</h4>
                <p>These backup documents are generated once. Make sure to save them before leaving this page.</p>
            </div>
        </div>
    );

    const renderMethodSelectionStep = () => (
        <div className="method-selection-flat">
            <div className="section-title">
                <h2>Choose How to Save Your Documents</h2>
                <p>Pick the method that works best for you</p>
            </div>

            <div className="method-options-side-by-side">
                <div className={`method-option ${preferredMethod === 'print' ? 'selected' : ''}`} 
                     onClick={() => handleMethodSelection('print')}>
                    <div className="option-header">
                        <FaPrint className="option-icon" />
                        <h3>Print Documents</h3>
                        <span className="security-badge">Most Secure</span>
                    </div>
                    <ul className="option-benefits">
                        <li>Keep data off your device</li>
                        <li>Immune to hacking & malware</li>
                        <li>Mitigates against cyber threats</li>
                        <li>Future-proof physical storage</li>
                    </ul>
                </div>

                <div className="method-divider">
                    <span>OR</span>
                </div>

                <div className={`method-option ${preferredMethod === 'download' ? 'selected' : ''}`}
                     onClick={() => handleMethodSelection('download')}>
                    <div className="option-header">
                        <FaDownload className="option-icon" />
                        <h3>Download Files</h3>
                        <span className="convenience-badge">Convenient</span>
                    </div>
                    <ul className="option-benefits">
                        <li>No printer required</li>
                        <li>Digital backup copies</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    const renderSaveStep = () => (
        <div className="save-step-flat">
            <div className="section-description">
                <p>
                    {preferredMethod === 'print' 
                        ? `Print your vault and all ${shares.length} keys together. You need ${consensus} keys to unlock your vault.`
                        : `Download your vault and ${shares.length} keys separately. You need ${consensus} keys to unlock your vault.`
                    }
                </p>
            </div>

            {preferredMethod === 'print' ? (
                <div className="single-action-container">
                    <div className="security-tips-section">
                        <h4>🖨️ Printing Security Tips</h4>
                        <ul>
                            <li><strong>Use a private offline printer</strong> (not shared/network printers)</li>
                            <li><strong>Clear printer memory/cache</strong> after printing</li>
                            <li><strong>Use archive-grade paper</strong> for long-term durability (acid-free, lignin-free)</li>
                            <li><strong>Don't fold the documents</strong> - use flat, tamper-proof envelopes to protect QR codes</li>
                        </ul>
                    </div>
                    
                    <Button
                        className={`choice-btn primary large ${printCompleted ? 'completed' : 'flashing'}`}
                        size="lg"
                        onClick={handlePrintAll}
                    >
                        <FaPrint /> &nbsp;
                        {printCompleted ? 'Print Again' : `Print Vault + All ${shares.length} Keys`}
                    </Button>
                </div>
            ) : (
                <div className="single-action-container">
                    <div className="download-files-section">
                        <div className="security-tips-section">
                            <h4>💾 Security Tips for Downloads</h4>
                            <ul>
                                <li>Vaults and keys should be stored seperatly.</li>
                                <li><strong>Delete from Downloads folder</strong> and empty trash/recycle bin when done</li>
                            </ul>
                        </div>
                        
                        <div className="download-actions">
                            <div className="vault-download-section">
                                <h4>📄 Vault Document</h4>
                                <p>Your encrypted data - download this first</p>
                                <Button
                                    className={`choice-btn primary ${vaultDownloaded ? 'completed' : 'flashing'}`}
                                    size="lg"
                                    onClick={handleVaultDownload}
                                >
                                    <FaDownload />
                                    {vaultDownloaded ? 'Download Again' : 'Download Vault PDF'}
                                </Button>
                            </div>
                            
                            <div className="keys-download-section">
                                <h4>🔑 Unlock Keys ({shares.length} total)</h4>
                                <p>Download each key individually</p>
                                
                                {keysDownloaded.size > 0 && (
                                    <div className="download-progress">
                                        <FaCheckCircle className="progress-icon" />
                                        <span>{keysDownloaded.size} of {shares.length} keys downloaded</span>
                                    </div>
                                )}
                                
                                <div className="individual-keys-compact">
                                    {shares.map((share, i) => (
                                        <Button
                                            key={i}
                                            className={`key-download-btn-compact ${keysDownloaded.has(i) ? 'completed' : ''}`}
                                            onClick={() => handleKeyDownload(share, i)}
                                            variant="outline-primary"
                                            size="sm"
                                            title={`${keyAliasArray[i]} - Key ${i+1} ${keysDownloaded.has(i) ? '(Click to download again)' : ''}`}
                                        >
                                            {keysDownloaded.has(i) ? '✓' : (i+1)}
                                        </Button>
                                    ))}
                                </div>
                                
                                <div className="keys-help-text">
                                    <small>Click numbered buttons to download each key individually.</small>
                                </div>
                            </div>
                        </div>
                        
                        {(vaultDownloaded || keysDownloaded.size > 0) && (
                            <div className="post-download-reminder">
                                <FaExclamationTriangle />
                                <span><strong>Don't forget:</strong> Move files to secure storage, use different channels, and clear downloads folder and trash/recycle bin!</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="step-navigation">
                <Button
                    variant="outline-secondary"
                    onClick={() => goBackToStep(1)}
                    className="back-btn"
                >
                    ← Change Method
                </Button>
                
                {allCompleted && (
                    <Button
                        variant="primary"
                        onClick={() => setCurrentStep(3)}
                        className="continue-btn"
                    >
                        Continue to Test →
                    </Button>
                )}
            </div>
        </div>
    );

    const renderTestStep = () => (
        <div className="test-step-simple">
            <div className="test-completion-message">
                <p>Your vault and keys have been saved. Now test that everything works:</p>
                
                <ul style={{textAlign: 'left', color: '#fff', fontSize: '14px', marginBottom: '30px'}}>
                    <li>Verify QR codes scan correctly</li>
                    <li>Confirm decryption works</li>
                    <li>Practice the unlock process</li>
                </ul>
            </div>

            <Link to="/unlock">
                <Button 
                    className="choice-btn primary large"
                    size="lg"
                >
                    <span>Test Unlock Process</span>
                    <FaArrowRight style={{marginLeft: '8px'}} />
                </Button>
            </Link>

            <div className="step-navigation">
                <Button
                    variant="outline-secondary"
                    onClick={() => goBackToStep(2)}
                    className="back-btn"
                >
                    ← Go Back
                </Button>
            </div>
        </div>
    );

    return (
        <div className="vault-download-wizard">
            {/* Header */}
            <div className="wizard-header">
                <div className="header-icon">
                    {currentStep === 1 ? <FaCheckCircle /> : 
                     currentStep === 2 ? <FaLock /> : 
                     <FaShieldAlt />}
                </div>
                <h1>
                    {currentStep === 1 ? '🎉 Vault Created Successfully!' :
                     currentStep === 2 ? (preferredMethod === 'print' ? 'Print Your Documents' : 'Download Your Documents') :
                     'Test Your Backup'}
                </h1>
                <p>
                    {currentStep === 1 ? 'Save your backup documents to complete the setup' :
                     currentStep === 2 ? `${preferredMethod === 'print' ? 'Print' : 'Download'} your vault and keys securely` :
                     'Verify your documents work before storing them'}
                </p>
            </div>

            {renderStepIndicator()}
            {/* {renderImportantNotice()} */}

            {/* Step Content */}
            <div className="wizard-content">
                {currentStep === 1 && renderMethodSelectionStep()}
                {currentStep === 2 && renderSaveStep()}
                {currentStep === 3 && renderTestStep()}
            </div>

            {/* Hidden PDF Components */}
            <div id="idvaultbackup" ref={refBackupVaultPDF} className="contentToPrint">
                {/* Vault Document */}
                <PDFVaultBackup
                    vaultIdent={vaultIdent}
                    cipherText={cipherText}
                    shares={shares}
                    threshold={consensus}
                    vaultName={vaultName}
                    description={description}
                    cipherIV={cipherIV}
                    createdTimestamp={createdTimestamp}
                    qrtype="printable"
                    keyAliasArray={keyAliasArray}
                    maxLengthPerQRCode={maxLengthPerQRCode}
                    vaultColors={vaultColors}
                />
                
                {/* All Keys */}
                {shares.map((share, i) => (
                    <PDFKeyBackup
                        id={`keyshare${i}`}
                        key={`share${i}`}
                        vaultIdent={vaultIdent}
                        threshold={consensus}
                        vaultName={vaultName}
                        description={description}
                        createdTimestamp={createdTimestamp}
                        myDecryptedKey={share}
                        qrtype="printable"
                        keyAlias={keyAliasArray[i]}
                        vaultColors={vaultColors}
                    />
                ))}
            </div>

            <div id="idkeybackup" ref={refBackupKeyPDF} className="contentToPrint">
                {shares.map((share, i) => (
                    <PDFKeyBackup
                        id={`keyshare${i}`}
                        key={`share${i}`}
                        vaultIdent={vaultIdent}
                        threshold={consensus}
                        vaultName={vaultName}
                        description={description}
                        createdTimestamp={createdTimestamp}
                        myDecryptedKey={share}
                        qrtype="printable"
                        keyAlias={keyAliasArray[i]}
                        vaultColors={vaultColors}
                    />
                ))}
            </div>
        </div>
    );
};

export default VaultDownloadSection; 