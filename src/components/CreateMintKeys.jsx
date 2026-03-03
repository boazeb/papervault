import React, { useEffect, useState } from 'react';
import '../style/index.css';
import '../style/homepage.css';
import { FaKey, FaUnlock, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
function CreateMintKeys(props) {
    const [totalShareholders, setTotalShareholders]  = useState(3);
    const [consensus, setConsensus]                  = useState(2);

    useEffect(()=>{
        // Remove hardcoded initialization - let parent handle it
        // props.setShareholders(3);  // ← Remove this line
        // props.setConsensus(2);     // ← Remove this line
    },[]);

    const setShareholders = (val) => {
        setTotalShareholders(val);
        props.setShareholders(val);
        
        // Handle consensus adjustment based on library constraints
        let newConsensus;
        if (val === 1) {
            // Single key - consensus must be 1
            newConsensus = 1;
        } else {
            // Multiple keys - secrets.js library requires minimum threshold of 2
            newConsensus = Math.max(2, Math.min(consensus, val));
        }
        
        setConsensus(newConsensus);
        props.setConsensus(newConsensus);
    };

    const updateConsensus = (val) => {
        setConsensus(val);
        props.setConsensus(val);
    };

    return (
        <div className="createMintKeysWrapper">
            <div className={'createSectionInnerWrapper'}>

                {/* Number of Keys Section */}
                <div className="key-config-section">
                    <h6 className="config-question" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaKey style={{ color: '#4caf50', fontSize: '1.1rem' }} />
                        Number of keys to create
                    </h6>
                    
                    {/* Benefit explanation */}
                    <div style={{
                        background: 'transparent',
                        padding: '0rem',
                        marginBottom: '1rem',
                        fontSize: '0.85rem',
                        textAlign: 'left',
                        color: '#b0b0b0'
                    }}>
                        Select the number of keys to create. An unlock threshold of 2 keys out of 3 total keys is a good balance for most personal use cases.
                    </div>



                    <div className="number-selector">
                        {Array.from({length: 20}, (_, i) => i + 1).map(num => {
                            return (
                                <button
                                    key={num}
                                    type="button"
                                    className={`number-btn ${totalShareholders === num ? 'active' : ''}`}
                                    onClick={() => setShareholders(num)}
                                    title={`${num} key${num !== 1 ? 's' : ''}`}
                                >
                                    {num}
                                </button>
                            );
                        })}
                    </div>

                    {/* Explanation for 1 key */}
                    {totalShareholders === 1 && (
                        <div className="key-config-section" style={{ marginTop: '1rem' }}>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                padding: '0.75rem',
                                fontSize: '0.85rem',
                                color: '#b0b0b0',
                                textAlign: 'left'
                            }}>
                                <span className="config-label config-label--not-recommended">This setting is not recommended</span>{' '}
                                You will only have one key. Additional keys are recommended for redundancy.
                            </div>
                        </div>
                    )}
                </div>

                {/* Explanation for 2 keys */}
                {totalShareholders === 2 && (
                    <div className="key-config-section">
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            fontSize: '0.85rem',
                            color: '#b0b0b0',
                            textAlign: 'left'
                        }}>
                            <span className="config-label config-label--not-recommended">This setting is not recommended</span>{' '}
                            Both keys will be required to unlock the vault. To ensure you can still access your vault if you lose a key, we recommend you create at least 3 keys for redundancy.
                        </div>
                    </div>
                )}

                                        {/* Threshold Section - Only show if more than 2 keys (need actual choice) */}
                {totalShareholders > 2 && (
                    <div className="key-config-section">
                        <h6 className="config-question" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaUnlock style={{ color: '#4caf50', fontSize: '1.1rem' }} />
                            Number of keys needed to unlock
                        </h6>
                        <div style={{
                            background: 'transparent',
                            padding: '0rem',
                            marginBottom: '1rem',
                            fontSize: '0.85rem',
                            textAlign: 'left',
                            color: '#b0b0b0'
                        }}>
                            Lower number = easier to recover. Higher number = harder to steal.
                        </div>
                        <div className="number-selector">
                            {Array.from({length: totalShareholders - 1}, (_, i) => i + 2).map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    className={`number-btn ${consensus === num ? 'active' : ''}`}
                                    onClick={() => updateConsensus(num)}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <p className="config-help">
                            {(consensus === 2 && totalShareholders === 3) || (consensus === 3 && totalShareholders === 5)
                                ? <><span className="config-label config-label--recommended">Recommended</span>{' '}{consensus} out of {totalShareholders} keys will be needed to unlock your vault</>
                                : consensus === totalShareholders
                                ? <div><FaExclamationTriangle style={{ color: '#f44336', fontSize: '1.1rem', marginRight: '0.5rem' }} /> Requiring all keys is risky if you lose any</div>
                                : <div><FaCheckCircle style={{ color: '#4caf50', fontSize: '1.1rem', marginRight: '0.5rem' }} /> {consensus} out of {totalShareholders} keys will be needed to unlock your vault</div>
                            }
                        </p>
                    </div>
                )}

            </div>
        </div>
    )
}

export default CreateMintKeys;


