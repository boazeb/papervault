import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import {
    FaWifi,
    FaCheck,
    FaChevronRight,
    FaChevronLeft,
    FaUserSecret,
    FaEyeSlash
} from 'react-icons/fa';

const SecurityPreparationStep = ({ isOnline, onContinue, onBack }) => {
    const [checkedItems, setCheckedItems] = useState({
        location: false,
        screen: false,
        offline: false
    });

    const [proceedOnline, setProceedOnline] = useState(false);

    const toggleCheck = (item) => {
        // Prevent unchecking offline if user is actually offline
        if (item === 'offline' && !isOnline && checkedItems.offline) {
            return; // Can't uncheck offline when actually offline
        }
        
        // Allow checking offline if user chose to proceed online
        if (item === 'offline' && isOnline && !proceedOnline) {
            return;
        }
        
        setCheckedItems(prev => ({
            ...prev,
            [item]: !prev[item]
        }));
    };

    // Automatically check/uncheck offline based on connection status
    useEffect(() => {
        if (isOnline) {
            // Uncheck offline if user goes online (unless they chose to proceed)
            if (!proceedOnline) {
                setCheckedItems(prev => ({
                    ...prev,
                    offline: false
                }));
            }
        } else {
            // Automatically check offline if user is offline
            setCheckedItems(prev => ({
                ...prev,
                offline: true
            }));
            setProceedOnline(false); // Reset proceed online when actually offline
        }
    }, [isOnline, proceedOnline]);

    const handleProceedOnline = () => {
        setProceedOnline(true);
        setCheckedItems(prev => ({
            ...prev,
            offline: true
        }));
    };

    const allItemsChecked = Object.values(checkedItems).every(checked => checked);

    return (
        <div className="wizard-step-container">
            <div className="create-vault-header">
                <h3 style={{ color: '#ffffff' }}>Security Check</h3>
                <p style={{ color: '#b0b0b0' }}>Ensure your environment is secure before entering sensitive data</p>
            </div>

            <div className="createSectionWrapper">
                <div className="checklist-container">
                    <div className={`checklist-item ${checkedItems.location ? 'checked' : ''}`} onClick={() => toggleCheck('location')}>
                        <div className="checklist-content">
                            <div className="checklist-header">
                                <FaUserSecret className="checklist-icon" />
                                <div className="checklist-text">
                                    <h5>Private Location</h5>
                                    <p className="checklist-description">
                                        You're in a secure, private location away from cameras and onlookers.
                                    </p>
                                </div>
                            </div>
                            <div className="checklist-status">
                                {checkedItems.location && <FaCheck />}
                            </div>
                        </div>
                    </div>

                    <div className={`checklist-item ${checkedItems.screen ? 'checked' : ''}`} onClick={() => toggleCheck('screen')}>
                        <div className="checklist-content">
                            <div className="checklist-header">
                                <FaEyeSlash className="checklist-icon" />
                                <div className="checklist-text">
                                    <h5>Screen Privacy</h5>
                                    <p className="checklist-description">
                                        Your screen is not visible to others and screen recording is disabled.
                                    </p>
                                </div>
                            </div>
                            <div className="checklist-status">
                                {checkedItems.screen && <FaCheck />}
                            </div>
                        </div>
                    </div>

                    <div className={`checklist-item ${checkedItems.offline ? 'checked' : ''} ${proceedOnline ? 'warning' : ''} ${isOnline && !proceedOnline ? 'disabled' : ''} ${!isOnline ? 'locked' : ''}`} onClick={() => toggleCheck('offline')}>
                        <div className="checklist-content">
                            <div className="checklist-header">
                                <FaWifi className="checklist-icon" />
                                <div className="checklist-text">
                                    <h5>Internet Connection</h5>
                                    <p className="checklist-description">
                                        {isOnline && !proceedOnline ? (
                                            <>
                                                Disconnect network cables, turn off wifi, bluetooth and mobile data for maximum security.{' '}
                                                <button 
                                                    className="proceed-anyway-link"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleProceedOnline();
                                                    }}
                                                >
                                                    Accept risk and proceed online
                                                </button>
                                            </>
                                        ) : proceedOnline ? (
                                            '⚠️ Proceeding online (security risk accepted)'
                                        ) : (
                                            '✓ Offline - Maximum security mode'
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="checklist-status">
                                {checkedItems.offline && <FaCheck />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="wizard-footer" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button
                            variant="outline-secondary"
                            size="lg"
                            onClick={onBack}
                            style={{ flex: 1.5, whiteSpace: 'nowrap' }}
                        >
                            <FaChevronLeft style={{fontSize: '14px', marginRight: '0.5rem'}} />
                            Back
                        </Button>
                        
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={onContinue}
                            disabled={!allItemsChecked}
                            style={{ flex: 2, whiteSpace: 'nowrap' }}
                        >
                            Continue
                            <FaChevronRight style={{fontSize: '14px', marginLeft: '0.5rem'}} />
                        </Button>
                    </div>
                    
                    {!allItemsChecked && (
                        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#888888', fontSize: '0.9rem' }}>
                            Please complete all security checks to continue
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecurityPreparationStep; 