import React from 'react';
import { Button } from 'react-bootstrap';
import { FaLockOpen, FaShieldAlt, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';
import { useState } from 'react';

const UnlockedVault = ({ decryptionResult, onClose }) => {
    const [showContent, setShowContent] = useState(true);

    // Safety check - don't render if no decryption result
    if (!decryptionResult) {
        return null;
    }

    const toggleVisibility = () => {
        setShowContent(!showContent);
    };

    return (
        <div className="unlocked-vault">
            <div className="unlocked-header">
                <div className="success-indicator">
                    <div className="success-icon">
                        <FaLockOpen />
                    </div>
                    <div className="success-content">
                        <h2>Vault Successfully Unlocked</h2>
                        <p>Your vault contents have been decrypted and are ready to view</p>
                    </div>
                </div>
                
                <div className="vault-actions">
                    <button 
                        className="action-button secondary"
                        onClick={toggleVisibility}
                        title={showContent ? "Hide content" : "Show content"}
                    >
                        {showContent ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>
            </div>

            <div className="vault-content-container">
                <div className="content-header">
                    <div className="content-info">
                        <FaShieldAlt className="content-icon" />
                        <h4>Decrypted Content</h4>
                    </div>
                    <div className="content-stats">
                        <span className="stat">
                            {(decryptionResult?.length || 0).toLocaleString()} characters
                        </span>
                    </div>
                </div>

                <div className="content-body">
                    {showContent ? (
                        <div className="content-display">
                            <pre className="vault-content">{decryptionResult}</pre>
                        </div>
                    ) : (
                        <div className="content-hidden">
                            <div className="hidden-message">
                                <FaEyeSlash />
                                <p>Content hidden for privacy</p>
                                <button onClick={toggleVisibility} className="show-button">
                                    Click to reveal
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="security-warning">
                <div className="warning-content">
                    <h5>⚠️ Security Notice</h5>
                    <p>
                        Your vault content is now decrypted in memory. For best security,
                        close this tab or browser when finished so sensitive data is cleared from memory.
                    </p>
                </div>
            </div>

            <div className="unlocked-actions">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={onClose}
                    className="close-vault-button"
                >
                    <FaTrash className="me-2" />
                    Close
                </Button>
            </div>
        </div>
    );
};

export default UnlockedVault; 