import React, { useEffect, useState } from 'react';
import '../style/index.css';
import '../style/homepage.css';
import { FaLock } from 'react-icons/fa';
import Typewriter from 'typewriter-effect';

function CreateLoading({ loadingComplete }) {
    const [loadingStep, setLoadingStep] = useState(1);

    useEffect(() => {
        const t1 = setTimeout(() => {
            setLoadingStep(2);
            const t2 = setTimeout(() => {
                loadingComplete();
            }, 5000);
            return () => clearTimeout(t2);
        }, 5000);
        return () => clearTimeout(t1);
    }, [loadingComplete]);

    return (
        <div className="loading-wrapper">
            <div className={'alert alert-info loading-alert'}>
                <h2 className="loading-title">
                    {loadingStep === 1 ? (
                        <Typewriter
                            options={{
                                strings: 'Encrypting ...',
                                autoStart: true,
                                loop: false,
                            }}
                        />
                    ) : (
                        <Typewriter
                            options={{
                                strings: 'Minting Keys ...',
                                autoStart: true,
                                loop: false,
                            }}
                        />
                    )}
                </h2>
            </div>

            <div className="loading-animation-container">
                <FaLock className="loading-icon" aria-hidden />
            </div>
        </div>
    )
}

export default CreateLoading;


