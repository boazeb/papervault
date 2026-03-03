import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { 
    FaShieldAlt, 
    FaWifi,
    FaCheck,
    FaChevronRight,
    FaQrcode,
    FaKey,
    FaUserSecret 
} from 'react-icons/fa';
const PreparationStep = ({ isOnline, onContinue }) => {
    const [checkedItems, setCheckedItems] = useState({
        vault: false,
        keys: false,
        location: false,
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

    const handleContinue = () => {
        onContinue();
    };

    const allItemsChecked = Object.values(checkedItems).every(checked => checked);

    return (
        <div className="preparation-content">
            <div className="preparation-header">
                <div className="header-icon">
                    <FaShieldAlt />
                </div>
                <h3>Prepare to unlock your vault</h3>
                <p className="header-subtitle">Follow the checklist to ensure you have everything ready</p>
            </div>

            <div className="checklist-container">
                <div className={`checklist-item ${checkedItems.vault ? 'checked' : ''}`} onClick={() => toggleCheck('vault')}>
                    <div className="checklist-content">
                        <div className="checklist-header">
                            <FaQrcode className="checklist-icon" />
                            <div className="checklist-text">
                                <h5>Encrypted Vault</h5>
                                <p className="checklist-description">
                                    Have your encrypted vault page(s) ready.
                                </p>
                            </div>
                        </div>
                        <div className="checklist-status">
                            {checkedItems.vault && <FaCheck />}
                        </div>
                    </div>
                </div>

                <div className={`checklist-item ${checkedItems.keys ? 'checked' : ''}`} onClick={() => toggleCheck('keys')}>
                    <div className="checklist-content">
                        <div className="checklist-header">
                            <FaKey className="checklist-icon" />
                            <div className="checklist-text">
                                <h5>Keys</h5>
                                <p className="checklist-description">
                                    You will need to have enough keys to meet the unlock threshold.
                                </p>
                            </div>
                        </div>
                        <div className="checklist-status">
                            {checkedItems.keys && <FaCheck />}
                        </div>
                    </div>
                </div>

                <div className={`checklist-item ${checkedItems.location ? 'checked' : ''}`} onClick={() => toggleCheck('location')}>
                    <div className="checklist-content">
                        <div className="checklist-header">
                            <FaUserSecret className="checklist-icon" />
                            <div className="checklist-text">
                                <h5>Secure Location</h5>
                                <p className="checklist-description">
                                    Find a private location away from cameras or onlookers.
                                </p>
                            </div>
                        </div>
                        <div className="checklist-status">
                            {checkedItems.location && <FaCheck />}
                        </div>
                    </div>
                </div>

                <div className={`checklist-item ${checkedItems.offline ? 'checked' : ''} ${proceedOnline ? 'warning' : ''} ${isOnline && !proceedOnline ? 'disabled' : ''} ${!isOnline ? 'locked' : ''}`} onClick={() => toggleCheck('offline')}>
                    <div className="checklist-content">
                        <div className="checklist-header">
                            <FaWifi className="checklist-icon" />
                            <div className="checklist-text">
                                <h5>Disconnect from Internet</h5>
                                <p className="checklist-description">
                                    {isOnline && !proceedOnline ? (
                                        <>
                                            Disconnect network cables, turn off wifi, bluetooth and mobile data.{' '}
                                            <button 
                                                className="proceed-anyway-link"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleProceedOnline();
                                                }}
                                            >
                                                Proceed anyway
                                            </button>
                                        </>
                                    ) : proceedOnline ? (
                                        '⚠️ Proceeding online (not recommended for security)'
                                    ) : (
                                        'Confirmed: No internet connection detected'
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

            <div className="action-section">
                <Button
                    variant="primary"
                    onClick={handleContinue}
                    className="continue-button"
                    disabled={!allItemsChecked}
                >
                    <span className="button-content">
                        Continue
                        <FaChevronRight style={{fontSize: '14px'}} />
                    </span>
                </Button>
                {!allItemsChecked && (
                    <p className="action-note">
                        Please check all items above to continue
                    </p>
                )}
            </div>
        </div>
    );
};

export default PreparationStep; 