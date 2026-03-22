import React, { useEffect, useRef, useState } from 'react';
import { Form, FormGroup, FormText, Button, Card } from 'react-bootstrap';
import { EncryptionService } from '../services/EncryptionService';
import ReactDOMServer from 'react-dom/server';
import { FaEye } from 'react-icons/fa';

import '../style/index.css';
import '../style/createPage.css';
import '../style/forms.css';
import '../style/dashboardPage.css';
import Cookies from 'universal-cookie';

import CreateMintKeys from "../components/CreateMintKeys";
import CreateLoading from "../components/CreateLoading";
import SecretDataEntry from "../components/SecretDataEntry";
import PDFVaultBackup from '../components/PDFVaultBackup';
import PDFKeyBackup from "../components/PDFKeyBackup";
import {useReactToPrint} from 'react-to-print';
import html2pdf from 'html2pdf.js';
import {Oval} from "react-loading-icons";
import VaultDownloadSection from './VaultDownloadSection';
import { getCurrentLimits, clearProSession } from '../config/limits';
import SecurityPreparationStep from './SecurityPreparationStep';
const WEBSITE_URL = 'https://papervault.xyz';

function CreateVault(props) {
    const cookies = new Cookies();

    const [secretValue, setSecretValue] = useState('');
    const [compressedSecretValue, setCompressedSecretValue] = useState('');
    const [cipherText, setCiphertext] = useState(null);
    const [, setCipherKey] = useState(null);
    const [cipherIV, setCipherIV] = useState(null);
    const [, setCipherOpenSSL] = useState(null);
    const [consensus, setConsensus] = useState(2);
    const [vaultIdent, setVaultIdent] = useState(null);
    const [wizardStep, setWizardStep] = useState(1);
    const [shares, setShares] = useState([]);
    const [vaultName, setVaultName] = useState('');
    const [totalShareholders, setTotalShareholders] = useState(3);
    const [maxSecretChars, setMaxChars] = useState(() => {
        const limits = getCurrentLimits();
        return limits.maxStorage;
    });
    const [maxVaultNameChars] = useState(50);
    const [keyAliasArray, setKeyAliasArray] = useState([]);

    const [hasPressedVaultPrint, setHasPressedVaultPrint] = useState(false);
    const [hasPressedKeyPrint, setHasPressedKeyPrint] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [description, setDescription] = useState('');

    const [createdTimestamp, setCreatedTimestamp] = useState();
    const refBackupVaultPDF = useRef(null);
    const refBackupKeyPDF = useRef(null);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [totalPages, setTotalPages] = useState();

    const maxLengthPerQRCode = 150;
    const [vaultColors, setVaultColors] = useState([]);


    useEffect(() => {
        const currentLimits = getCurrentLimits();
        setMaxChars(currentLimits.maxStorage);
    }, []);

    const calculateHowManyPages = (value) => {
        // Single QR code vault - all data combined
        // The combined vault data (metadata + encrypted content) will be in one QR code
        // This should typically result in Version 6-8 QR codes which are very scannable
        
        // Always return 1 page since everything is in a single QR code
        return 1;
    };

    const setSecret = (newSecretValue) => {
        // Always allow the update - let the UI handle the character limit warnings
        // Note: We'll calculate pages based on compressed version at encryption time
        setSecretValue(newSecretValue);
    };

    const setVaultNameValue = (newVaultName) => {
        if (newVaultName.length > vaultName.length) {
            if ((vaultName.length >= maxVaultNameChars) || (newVaultName.length - 1 >= maxVaultNameChars)) {
                return;
            }
        }
        setVaultName(newVaultName);
        setCookie('papervault_vaultname', newVaultName);
    };

    const setCookie = (cookieName, cookieValue) => {
        const expirationTime = 10 * 60 * 1000; // 10 minutes in milliseconds

        const cookieOptions = {
            maxAge: expirationTime,
            secure: typeof window !== 'undefined' && window.location?.protocol === 'https:',
            sameSite: 'strict',
        };

        cookies.set(cookieName, cookieValue, cookieOptions);
    };

    const generateColors = () => {
        // A set of easy-to-identify, high-contrast colors
        const baseColors = [
            '#FF0000', // Red
            '#0000FF', // Blue
            '#008000', // Green
            '#FFA500', // Orange
            '#800080', // Purple
            '#A52A2A', // Brown
            '#000000', // Black 
            '#FF00FF', // Magenta
            '#00FFFF', // Cyan
            '#FFD700'  // Gold
        ];
        
        // Randomly select 3 distinct colors
        const selectedColors = [];
        const copyColors = [...baseColors];
        
        for (let i = 0; i < 3; i++) {
            if (copyColors.length === 0) break;
            const randomIndex = Math.floor(Math.random() * copyColors.length);
            selectedColors.push(copyColors[randomIndex]);
            copyColors.splice(randomIndex, 1);
        }
        
        return selectedColors;
    };

    useEffect(()=>{
        if (wizardStep===5 && compressedSecretValue) {
            setTimeout(() => {
                setVaultColors(generateColors());
                setTotalPages(calculateHowManyPages(compressedSecretValue));

                EncryptionService.encrypt(compressedSecretValue, false).then((encryptionResult) => {
                    setCiphertext(encryptionResult.cipherText);
                    setCipherKey(encryptionResult.cipherKey);
                    setCipherIV(encryptionResult.cipherIV);
                    setCipherOpenSSL(encryptionResult.cipherOpenSSL);
                    setVaultIdent('papervault-coldstorage');
                    setCreatedTimestamp(Math.floor(Date.now() / 1000));

                    const n = parseInt(totalShareholders, 10);
                    const t = parseInt(consensus, 10);
                    const version = encryptionResult.version || '2';
                    if (n === 1 && version === '1') {
                        setShares([encryptionResult.cipherKey]);
                    } else {
                        EncryptionService.splitKey(encryptionResult.cipherKey, n, t, version).then((xshares) => {
                            setShares(xshares);
                        }).catch((err) => {
                            console.error('splitKey failed', err);
                            alert('Failed to generate keys: ' + (err?.message || 'Please try again.'));
                        });
                    }
                });
            }, 1000);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- consensus, totalShareholders used inside encryption flow
    }, [wizardStep, compressedSecretValue]);

    // Clear pro session when component unmounts (vault creation complete or cancelled)
    useEffect(() => {
        return () => {
            clearProSession();
        };
    }, []);

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

    useEffect(() => {
        const handleOnline  = () => setIsOnline(navigator.onLine);
        const handleOffline = () => setIsOnline(navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const cookieVaultName = cookies.get('papervault_vaultname');
       let cookieVaultDescription   = cookies.get('papervault_vaultdescription');
       let cookieShares             = cookies.get('papervault_shares');
       let cookieThreshold          = cookies.get('papervault_threshold');

       if (cookieVaultDescription) setDescription(cookieVaultDescription);
       if (cookieVaultName) setVaultName(cookieVaultName);
       if (cookieShares) setTotalShareholders(cookieShares);
        if (cookieThreshold) setConsensus(cookieThreshold);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to restore cookies
    }, []);

    const exceedsKeyLimit = () => {
        return totalShareholders > getCurrentLimits().maxShares;
    };


    const continueWizard = async (forcepage) => {
        if (!agreeToTerms) {
            alert('You must agree to the terms to use this service');
            return;
        }

        if (!vaultName) {
            alert('Enter a vault name');
            return;
        }

        if (exceedsKeyLimit()) {
            const maxKeys = getCurrentLimits().maxShares;
            alert(`Maximum ${maxKeys} keys supported due to cryptographic library constraints. Please reduce the number of keys.`);
            return;
        }

        //forcepage is just for testing purposes
        if (forcepage) {
            setWizardStep(forcepage);
            return;
        }

        const aliases = EncryptionService.generateListOfCombinedWords(totalShareholders);  
        setKeyAliasArray(aliases);
        setWizardStep(2); // Go to security check first
    };

    const continueFromSecurity = () => {
        setWizardStep(3); // Go to secret data entry
    };

    const continueFromSecretData = (compressedText) => {
        setCompressedSecretValue(compressedText || secretValue); // Use compressed version for storage
        setWizardStep(4); // Go to preview step (new)
    };

    const continueFromPreview = () => {
        setWizardStep(5); // Go to encryption step (shifted from 4 to 5)
    };


    // --- Browser print quirks ---
    // Chrome (desktop & mobile): works with react-to-print's iframe approach
    //   and the base @media print CSS in createPage.css.
    // Safari desktop: react-to-print iframe works, BUT Safari ignores @page
    //   margins (~20mm top clip) and can't handle forced 210mm widths. Fixed
    //   by injecting overrides via pageStyle into the iframe.
    // Safari mobile (iOS): react-to-print's iframe.contentWindow.print()
    //   doesn't trigger the iOS system print dialog. Bypassed entirely by
    //   calling window.print() on the main document; the @media print CSS
    //   in createPage.css handles hiding UI and showing print content.
    // Chrome on iOS (CriOS) / Firefox on iOS (FxiOS): excluded from Safari
    //   detection since they use their own print wrappers despite sharing WebKit.
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    const isSafariMobile = isSafari && /iPhone|iPod/i.test(navigator.userAgent);

    const safariPrintStyle = `
        .contentToPrint { display: block !important; visibility: visible !important; }
        @media print {
            body, html, #idvaultbackup {
                width: auto !important;
                min-width: auto !important;
                max-width: none !important;
            }
            #idvaultbackup {
                margin-top: 20mm !important;
            }
        }
    `;

    const handlePrint = useReactToPrint({
        onPrintError: () => {},
        content: () => refBackupVaultPDF.current,
        removeAfterPrint: true,
        ...(isSafari && !isSafariMobile && { pageStyle: safariPrintStyle }),
    });

    const doPrintVault = () => {
        setHasPressedVaultPrint(true);
        if (isSafariMobile) {
            window.print();
        } else {
            handlePrint();
        }
    };
    const handlePrintKeys = useReactToPrint({
        onPrintError: () => {},
        content: () => refBackupKeyPDF.current,
        removeAfterPrint: true,
        ...(isSafari && !isSafariMobile && { pageStyle: safariPrintStyle }),
    });

    const doPrintKeys = () => {

        handlePrintKeys();
        setHasPressedKeyPrint(true);
    };

    const downloadVault = async () => {
        const printElement = ReactDOMServer.renderToString(
            <div style={{padding:0}}>
                <PDFVaultBackup
                vaultIdent          = {vaultIdent}
                cipherText          = {cipherText}
                shares              = {shares}
                threshold           = {consensus}
                vaultName           = {vaultName}
                description         = {description}
                cipherIV            = {cipherIV}
                createdTimestamp    = {createdTimestamp}
                qrtype              = {'downloadable'}
                keyAliasArray       = {keyAliasArray}
                maxLengthPerQRCode  = {maxLengthPerQRCode}
                vaultColors={vaultColors}
            />
            </div>
        );
        const opt = {
            filename: "PaperVault.xyz - Vault - " + vaultName + ".pdf",
            pagebreak: { before: '.pagebreak', mode: ['avoid-all', 'css', 'legacy'] },
            margin: [10, 10, 10, 10],
            jsPDF: { format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(printElement, 'string').save();
    };

    const downloadKey = async (share, i) => {
        const printElement = ReactDOMServer.renderToString(
            <div style={{padding:0}}>
                <PDFKeyBackup
                    vaultIdent={vaultIdent}
                    threshold={consensus}
                    vaultName={vaultName}
                    description={description}
                    createdTimestamp={createdTimestamp}
                    myDecryptedKey={share}
                    qrtype={'downloadable'}
                    keyAlias={keyAliasArray[i]}
                    vaultColors={vaultColors}
                />
            </div>
        );

        const opt = {
            filename: "papervault-key-" + keyAliasArray[i] + ".pdf",
            pagebreak: { before: '.pagebreak', mode: ['avoid-all', 'css', 'legacy'] }
        };
        await html2pdf().set(opt).from(printElement, 'string').save();
    };



    if (props.isLoading) {
        return (
            <div className={'centerLoading createPageWrapper'} style={{background: '#0a0a0a', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Oval stroke="#1786ff" strokeWidth={10} strokeOpacity={1} speed={1} style={{width:25}} />
            </div>
        )
    }

    return (

        <div>
            <div className="createPageWrapper">
                
                <div>

                    <div style={{flex:1}}>
                    {wizardStep === 1 && (
                        <div className="wizard-step-container">
                            <div className="create-vault-header">
                                <h1>Create a vault</h1>
                            </div>
                            <Form>
                                <Card className="create-vault-card">
                                    <Card.Body>
                                        <FormGroup className={'formGroup'} controlId="formBasicName">
                                            <input 
                                                name="vaultName" 
                                                type="text" 
                                                autoComplete="off"
                                                placeholder={'Vault Name'}
                                                onChange={(e) => setVaultNameValue(e.target.value)}
                                                value={vaultName}
                                                className={'form-control formControls'}
                                            />
                                            <FormText className="text-muted">
                                                <div style={{marginTop:5}}>
                                                    A friendly name that will be visible on your vault and keys
                                                </div>
                                                {((vaultName.length)>=(maxVaultNameChars*0.25)) && (
                                                    <div style={{marginTop:8, fontSize: '0.85rem', opacity: 0.8}}>
                                                        {maxVaultNameChars - vaultName.length} characters remaining
                                                    </div>
                                                )}
                                            </FormText>
                                        </FormGroup>
                                    </Card.Body>
                                </Card>

                                <Card className="create-vault-card">
                                    <Card.Body>
                                        <CreateMintKeys 
                                            setShareholders={(val) => setTotalShareholders(val)}
                                            setConsensus={(val) => setConsensus(val)}
                                        />
                                    </Card.Body>
                                </Card>

                                <Card className="create-vault-card">
                                    <Card.Body>
                                        <FormGroup className='formGroupCheckbox create-vault-terms-label'>
                                            <Form.Check
                                                inline
                                                label={<span>Agree to the <a href={`${WEBSITE_URL}/legal`} target="_blank" rel="noopener noreferrer" className="linkage">Terms of service</a></span>}
                                                name="group1"
                                                type={'checkbox'}
                                                id={`inline--1`}
                                                checked={agreeToTerms}
                                                onChange={(e)=>setAgreeToTerms(e.target.checked)}
                                            />
                                        </FormGroup>

                                        <FormGroup className={'formGroup'} style={{marginTop: 20}}>
                                            <div className="wizard-footer">
                                                <Button 
                                                    variant={'primary'} 
                                                    size={'lg'}
                                                    onClick={() => continueWizard()}
                                                >
                                                    Continue
                                                </Button>
                                            </div>
                                        </FormGroup>
                                    </Card.Body>
                                </Card>
                            </Form>
                        </div>
                    )}

                </div>

                {wizardStep === 2 && (
                    <SecurityPreparationStep
                        isOnline={isOnline}
                        onContinue={continueFromSecurity}
                        onBack={() => setWizardStep(1)}
                    />
                )}

                <div>
                {wizardStep === 3 ?
                    <SecretDataEntry
                        secretValue={secretValue}
                        setSecret={setSecret}
                        maxSecretChars={maxSecretChars}
                        totalPages={totalPages}
                        isOnline={isOnline}
                        onContinue={continueFromSecretData}
                    />
                    : null}
                </div>

                {wizardStep === 4 ?
                    <div className="wizard-step-container">
                        <div className="secret-entry-header">
                            <div className="header-icon">
                                <FaEye />
                            </div>
                            <h3>Preview Your Vault Contents</h3>
                            <p className="header-subtitle">
                                Review how your data will be formatted in the encrypted vault
                            </p>
                        </div>

                        <Card className="preview-card">
                            <Card.Header>
                                <h5>Vault Contents</h5>
                            </Card.Header>
                            <Card.Body>
                                <pre className="preview-content">{compressedSecretValue}</pre>
                            </Card.Body>
                        </Card>

                        <div className="continue-section mt-4">
                            <div className="d-flex gap-2">
                                <Button 
                                    variant={'outline-secondary'} 
                                    size={'lg'}
                                    onClick={() => setWizardStep(3)}
                                >
                                    ← Back to Edit
                                </Button>
                                <Button 
                                    variant={'primary'} 
                                    size={'lg'}
                                    onClick={continueFromPreview}
                                    className="flex-fill"
                                >
                                    Encrypt & Continue
                                </Button>
                            </div>
                        </div>
                    </div>
                    : null}

                {wizardStep === 5 ?
                    <div className={'loadingStepWrapper'}>
                        <CreateLoading loadingComplete={()=>setWizardStep(6)} />
                    </div>
                    : null
                }

                {wizardStep === 6 ?
                    <VaultDownloadSection
                        hasPressedVaultPrint={hasPressedVaultPrint}
                        hasPressedKeyPrint={hasPressedKeyPrint}
                        doPrintVault={doPrintVault}
                        doPrintKeys={doPrintKeys}
                        downloadVault={downloadVault}
                        downloadKey={downloadKey}
                        refBackupVaultPDF={refBackupVaultPDF}
                        refBackupKeyPDF={refBackupKeyPDF}
                        vaultIdent={vaultIdent}
                        cipherText={cipherText}
                        shares={shares}
                        consensus={consensus}
                        vaultName={vaultName}
                        description={description}
                        cipherIV={cipherIV}
                        createdTimestamp={createdTimestamp}
                        keyAliasArray={keyAliasArray}
                        maxLengthPerQRCode={maxLengthPerQRCode}
                        vaultColors={vaultColors}
                    />
                    : null}
                </div>


            </div>
        </div>
    );
}

export default CreateVault;


