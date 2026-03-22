import React from 'react';
import moment from 'moment-timezone';
import QRCode from 'qrcode.react';
import QRCode2 from 'qrcode';
import { StyleSheet, Image } from '@react-pdf/renderer';
import { CURRENT_VAULT_VERSION } from '../config/vaultConfig';

const PDFVaultBackup = (props) => {
    if (!props.cipherText) {
        return null;
    }

    const tmpQRArray = [];
    const SPLIT_THRESHOLD_BYTES = 420;

    const combinedPayload = JSON.stringify({
        id: 1,
        vault: 'papervault.xyz',
        version: CURRENT_VAULT_VERSION,
        name: props.vaultName,
        shares: props.shares.length,
        threshold: props.threshold,
        cipherIV: props.cipherIV,
        keys: props.keyAliasArray,
        data: props.cipherText
    });

    const payloadBytes = new TextEncoder().encode(combinedPayload).length;
    let totalQRs;

    if (payloadBytes <= SPLIT_THRESHOLD_BYTES) {
        // Single QR — payload is small enough
        const canvas = document.createElement('canvas');
        QRCode2.toCanvas(canvas, combinedPayload, {
            errorCorrectionLevel: 'M', width: 250, margin: 2
        }).catch(() => {});
        tmpQRArray.push({ qrCode: canvas.toDataURL(), id: 1, raw: combinedPayload });
        totalQRs = 1;
    } else {
        // Split into metadata QR + data QR
        const metadataPayload = JSON.stringify({
            id: 1,
            vault: 'papervault.xyz',
            version: CURRENT_VAULT_VERSION,
            name: props.vaultName,
            shares: props.shares.length,
            threshold: props.threshold,
            cipherIV: props.cipherIV,
            keys: props.keyAliasArray,
            qrcodes: 2
        });
        const dataPayload = JSON.stringify({
            id: 2,
            data: props.cipherText
        });

        const canvas1 = document.createElement('canvas');
        QRCode2.toCanvas(canvas1, metadataPayload, {
            errorCorrectionLevel: 'M', width: 250, margin: 2
        }).catch(() => {});
        tmpQRArray.push({ qrCode: canvas1.toDataURL(), id: 1, raw: metadataPayload });

        const canvas2 = document.createElement('canvas');
        QRCode2.toCanvas(canvas2, dataPayload, {
            errorCorrectionLevel: 'M', width: 250, margin: 2
        }).catch(() => {});
        tmpQRArray.push({ qrCode: canvas2.toDataURL(), id: 2, raw: dataPayload });
        totalQRs = 2;
    }

    const qrArray = [tmpQRArray];

    const formatTime = (timestamp) => {
        return moment.tz(new Date(timestamp*1000), 'YYYY-MM-DD', moment.tz.guess()).format('YYYY-MM-DD HH:mm:ss')
    };

    const defaultColors = ['#FF0000', '#0000FF', '#008000'];
    const effectiveColors = (props.vaultColors && props.vaultColors.length > 0)
        ? props.vaultColors 
        : defaultColors;

    const styles = StyleSheet.create({
        printPage: {
            flex: 1,
            flexGrow: 1,
            width: '100%',
            minHeight: '297mm', // A4 height
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
        },
        downloadPage: {
            flex: 1,
            flexGrow: 1,
            width: '100%',
            minHeight: 'auto', // Let content determine height for downloads
            maxHeight: '297mm', // Don't exceed A4 height
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
        },
        highlightStyle: {
            color: '#000', // gold/orange
            fontWeight: 'bold',
            textDecoration: 'underline',
        },
        asciiBoxStyle: {
            fontFamily: 'monospace',
            fontSize: props.qrtype === 'downloadable' ? 14 : 16,
            color: '#000',
            padding: props.qrtype === 'downloadable' ? '12px 20px' : '24px 32px',
            marginBottom: 0,
            whiteSpace: 'pre',
            borderRadius: 8,
            width: '100%',
            boxSizing: 'border-box',
        },
        page: {
            backgroundColor: '#fff',
            width: '100%',
            height: props.qrtype === 'downloadable' ? 'auto' : '100%',
            padding: 0,
            display: props.qrtype === 'downloadable' ? 'flex' : 'block',
            ...(props.qrtype === 'downloadable' ? { flexDirection: 'column', flex: 1, flexGrow: 1 } : {}),
            position: 'relative',
            boxSizing: 'border-box',
            overflow: 'hidden',
        },
        sectionTop: {
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'left',
            borderBottom: '2px solid #e9ecef',
        },
        headerContainer: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '4px 0',
            gap: 6,
            width: '100%',
        },
        vaultTitle: {
            fontFamily: "Helvetica-BoldOblique",
            fontSize: 30,
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
        },
        alertDanger: {
            backgroundColor: '#fff3f3',
            color: '#dc3545',
            borderWidth: 1,
            borderColor: '#dc3545',
            borderStyle: 'solid',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 16,
            padding: '8px 12px',
            borderRadius: 4,
            marginLeft: 20,
        },
        unlockLink: {
            color: '#0d6efd',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
        },
        detailWrapper: {
            borderWidth: 1,
            borderRadius: 8,
            borderColor: '#e9ecef',
            borderStyle: 'solid',
            padding: 0,
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginTop: 12,
        },
        detailTable: {
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
        },
        detailRow: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            padding: '10px 0',
            borderTop: '1px solid #f0f2f5',
        },
        detailRowLast: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            padding: '8px 0',
        },
        detailLabel: {
            width: 140,
            minWidth: 140,
            fontFamily: "Helvetica-Bold",
            color: '#000',
            fontSize: 14,
            paddingRight: 16,
            textAlign: 'right',
            letterSpacing: 0.1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
        },
        detailValue: {
            flex: 1,
            fontFamily: "Helvetica",
            color: '#495057',
            fontSize: 14,
            paddingLeft: 8,
            wordBreak: 'break-word',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 4,
        },
        keyAlias: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            margin: '2px 2px',
            borderWidth: 1,
            borderColor: '#e9ecef',
            borderStyle: 'solid',
            fontSize: 12,
            padding: '2px 6px',
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            color: '#495057',
            transition: 'all 0.2s ease',
        },
        keysContainer: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: 0,
            marginTop: 0,
        },
        keysLabel: {
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
        },
        vaultNameHeader: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '0',
            maxWidth: '50%',
            flex: '0 0 auto',
        },
        vaultNameLabel: {
            width: 140,
            minWidth: 140,
            fontFamily: "Helvetica-Bold",
            color: '#2c3e50',
            fontSize: 16,
            paddingRight: 16,
            textAlign: 'right',
            letterSpacing: 0.1,
        },
        vaultNameValue: {
            flex: 1,
            fontFamily: "Helvetica",
            color: '#2c3e50',
            fontSize: 16,
            paddingLeft: 8,
            wordBreak: 'break-word',
        },
        QRWrapperMiddle: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            width: '100%',
            padding: props.qrtype === 'downloadable' ? '30px 0 60px 0' : '0',
            gap: 0,
            alignItems: 'flex-start', // Align to left instead of center
        },
        QRWrapperMiddleSecondPage: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            width: '100%',
            padding: '0',
            marginTop: props.qrtype === 'downloadable' ? 40 : 100,
            paddingBottom: props.qrtype === 'downloadable' ? 60 : 0,
        },
        QRRow: {
            
        },
        QRWrapperInner: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
        },
        QRText: {
            fontFamily: 'Helvetica-Bold',
            fontSize: 18,
            color: '#0d6efd',
            fontWeight: 400,
            letterSpacing: 0.2,
            wordSpacing: 0.2,
            padding: '4px 16px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            border: '1px solid #0d6efd',
            borderRadius: 4,
            textTransform: 'uppercase',
            marginBottom:15,
        },
        QRCodeContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            padding: props.qrtype === 'downloadable' ? '15px' : '10px',
            height: props.qrtype === 'downloadable' ? 280 : 300,  // Reduced for smaller QR
            width: props.qrtype === 'downloadable' ? 280 : 300,   // Reduced for smaller QR
            margin: '0', // Reset margin since we're positioning via flex layout
            border: '1px dotted #ccc', // Light dotted border around QR code
            borderRadius: '8px', // Slight rounding for a softer look
        },
        QRImage: {
            width: 250,  // Reduced from 320 to 250
            height: 250, // Reduced from 320 to 250
            padding: 10,
            backgroundColor: '#fff',
            objectFit: 'contain',
        },
        pageNumber: {
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 16,
            color: '#000',
            fontFamily: 'Helvetica',
        },
        vaultTitleCompact: {
            fontFamily: "Helvetica-BoldOblique",
            fontSize: 25,
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: '60%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        headerRight: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            fontSize: 16,
            color: '#000',
            fontWeight: 500,
            textAlign: 'right',
            fontFamily: 'monospace',
            minWidth: '200px',
            flex: '0 0 auto',
        },
        QRWarning: {
            fontFamily: 'Helvetica-Oblique',
            fontSize: 16,
            color: '#dc3545',
            fontWeight: 600,
            letterSpacing: 0.1,
            wordSpacing: 0.1,
            ...(props.qrtype === 'printable' 
                ? {
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    paddingRight: '20px',
                    position: 'relative'
                  }
                : {
                    transform: 'rotate(-90deg)',
                    paddingRight: '0px',
                    position: 'absolute',
                    left: '0px', // Reduced from -80px to stay within margins
                    width: '100px',
                    textAlign: 'center'
                  }
            )
        },
        QRLeftText: {
            fontFamily: 'Helvetica-Oblique',
            fontSize: 16,
            color: '#dc3545',
            fontWeight: 600,
            letterSpacing: 0.1,
            wordSpacing: 0.1,
            ...(props.qrtype === 'printable'
                ? {
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    paddingLeft: '30px',
                    position: 'relative'
                  }
                : {
                    transform: 'rotate(90deg)',
                    paddingLeft: '0px',
                    position: 'absolute',
                    left: '-40px', // Reduced from -80px to stay within margins
                    width: '100px',
                    textAlign: 'center'
                  }
            )
        },
        qrCount: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '4px 12px',
            border: '1px solid #e9ecef',
            borderRadius: 4,
            minWidth: 80,
        },
        qrCountNumber: {
            fontFamily: 'Helvetica-Bold',
            fontSize: 16,
            color: '#2c3e50',
        },
        qrCountLabel: {
            fontFamily: 'Helvetica',
            fontSize: 12,
            color: '#6c757d',
            marginTop: 2,
        },
        colorIdentifier: {
            display: 'flex',
            flexDirection: 'row',
            height: '6px',
            marginTop: '10px',
            overflow: 'hidden',
        },
        colorBox: {
            width: '28px',
            height: '28px',
            border: '1px solid #333',
            borderRadius: '4px',
        },
        asciiImportantBox: {
            width: '100%',
            marginTop: 16,
            marginBottom: 16,
            fontFamily: 'monospace',
        },
        asciiDetailsSection: {
            fontFamily: 'monospace',
            whiteSpace: 'pre',
        },
        printPageBreak: {
            pageBreakBefore: 'always',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
        },
    });

    const renderQR = (qrData, ii, i) => {
        return (
            <div key={'qrkey'+ii+'_'+i} style={styles.QRWrapperInner}>
                <div style={styles.QRCodeContainer}>
                    {props.qrtype==='printable'?
                        <QRCode 
                            id='qrcodekey' 
                            value={qrData.raw} 
                            size={250}  // Reduced from 320 to 250
                            level="M"   // Good balance of error correction and capacity
                            includeMargin={true}
                        />
                        :null
                    }
                    {props.qrtype==='downloadable'?
                        <Image 
                            src={qrData.qrCode} 
                            style={styles.QRImage}
                            alt={`QR Code ${qrData.id === 1 ? 'Metadata' : `Data Shard #${totalQRs-1}`}`}
                        />
                        :null
                    }

                </div>
            </div>
        )
    };

    const renderColorBoxes = () => {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '0px',
                alignItems: 'flex-end'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '8px',
                }}>
                    {effectiveColors.map((color, index) => (
                        <div key={index} style={{
                            width: '28px',
                            height: '28px',
                            backgroundColor: color,
                            border: '1px solid #333',
                            borderRadius: '4px',
                            textAlign: 'center',
                            lineHeight: '28px',
                            fontSize: '16px',
                            color: color === '#000000' ? '#FFFFFF' : '#000000',
                            fontWeight: 'bold'
                        }}>
                            &nbsp;
                        </div>
                    ))}
                </div>
            </div>
        );
    };


    return (
        <div style={{
            ...(props.qrtype==='printable'?styles.printPage:styles.downloadPage),
            ...(props.qrtype === 'downloadable' && {
                pageBreakAfter: 'avoid',
                pageBreakInside: 'avoid'
            })
        }}>
            <div style={styles.page}>
                {/* Main content area with elevated QR code */}
                <div style={{
                    ...(props.qrtype === 'downloadable'
                        ? { display: 'flex', flexDirection: 'row', gap: '20px', flex: 1 }
                        : { overflow: 'hidden' }),
                    padding: props.qrtype === 'downloadable' ? '15px' : '20px',
                }}>
                    {/* Left side - QR Code elevated */}
                    <div style={{
                        ...(props.qrtype === 'downloadable'
                            ? { flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'center' }
                            : { float: 'left', width: '320px', marginRight: '40px', textAlign: 'center' }),
                    }}>
                        {totalQRs > 1 && (
                        <div style={{
                            fontSize: 11,
                            fontWeight: 'bold',
                            color: '#495057',
                            textAlign: 'center',
                            fontFamily: 'Helvetica-Bold',
                            marginBottom: '4px'
                        }}>
                            VAULT QR 1 of {totalQRs}
                        </div>
                    )}
                    {renderQR(qrArray[0][0], 0, 0)}
                        {totalQRs > 1 && qrArray[0][1] && (
                            <>
                                <div style={{
                                    fontSize: 11,
                                    fontWeight: 'bold',
                                    color: '#495057',
                                    textAlign: 'center',
                                    fontFamily: 'Helvetica-Bold',
                                    marginTop: '15px',
                                    marginBottom: '4px'
                                }}>
                                    VAULT QR 2 of {totalQRs}
                                </div>
                                {renderQR(qrArray[0][1], 0, 1)}
                            </>
                        )}
                        <div style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: '#dc3545',
                            marginTop: '15px',
                            textAlign: 'center',
                            fontFamily: 'Helvetica-Bold',
                            fontStyle: 'italic'
                        }}>
                            DO NOT FOLD
                        </div>
                        
                    </div>
                    
                    {/* Right side - ASCII art and information */}
                    <div style={{
                        ...(props.qrtype === 'downloadable'
                            ? { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }
                            : { overflow: 'hidden' }),
                    }}>
                        {/* Header section */}
                        <div style={{
                            overflow: 'hidden',
                            marginBottom: '20px'
                        }}>
                            <h1 style={{
                                fontSize: 20,
                                fontWeight: 'bold',
                                color: '#2c3e50',
                                margin: '4px 0px 0px 0px',
                                fontFamily: 'Helvetica-Bold',
                                float: 'left'
                            }}>
                                PAPERVAULT.XYZ VAULT
                            </h1>
                            <div style={{ float: 'right' }}>{renderColorBoxes()}</div>
                        </div>
                        
                        {/* ASCII art */}
                        <div style={{
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: '#2c3e50',
                            lineHeight: 1.1,
                            whiteSpace: 'pre',
                            marginBottom: '20px'
                        }}>
                            {` ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
 ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
 ██║   ██║███████║██║   ██║██║     ██║   
 ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   
  ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   
   ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   `}
                        </div>

                        {/* Instructions */}
                        <div style={{
                            backgroundColor: '#f8f9fa',
                            padding: '20px',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef',
                            marginTop: props.qrtype === 'printable' ? '20px' : 0
                        }}>
                            <h3 style={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                color: '#2c3e50',
                                margin: '0 0 12px 0',
                                fontFamily: 'Helvetica-Bold'
                            }}>
                                How to Unlock
                            </h3>
                            <ol style={{
                                fontSize: 14,
                                color: '#495057',
                                margin: 0,
                                paddingLeft: '20px',
                                fontFamily: 'Helvetica'
                            }}>
                                <li>Go to <strong>papervault.xyz/unlock</strong></li>
                                <li>Go offline</li>
                                <li>Scan your vault QR code{totalQRs > 1 ? 's' : ''} (this page)</li>
                                <li>Scan {props.threshold} key{props.threshold > 1 ? 's' : ''}</li>
                            </ol>

                            <div style={{
                                fontSize: 14,
                                color: '#495057',
                                margin: '10px 0px 0px 0px',
                                fontFamily: 'Helvetica'
                            }}>
                                Note: The unlock utility is open source and is available at https://github.com/boazeb/papervault 
                            </div>
                            
                        </div>

                     
                        {/* Vault details */}
                        <div style={{
                            backgroundColor: '#fff',
                            padding: '20px',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef',
                            marginTop: props.qrtype === 'printable' ? '20px' : 0
                        }}>
                            <h3 style={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                color: '#2c3e50',
                                margin: '0 0 12px 0',
                                fontFamily: 'Helvetica-Bold'
                            }}>
                                Vault Details
                            </h3>
                            <div style={{
                                fontSize: 14,
                                color: '#495057',
                                fontFamily: 'Helvetica',
                                lineHeight: 1.5
                            }}>
                                <div><strong>Name:</strong> {props.vaultName}</div>
                                <div><strong>Keys Required:</strong> {props.threshold} of {props.shares.length}</div>
                                <div><strong>Created:</strong> {formatTime(props.createdTimestamp)}</div>
                                <div style={{marginTop: '8px'}}>
                                    <strong>Key Names:</strong>
                                    <div style={{marginTop: '4px'}}>
                                        {props.keyAliasArray.map((key, index) => (
                                            <span key={index} style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                margin: '2px 4px 2px 0',
                                                backgroundColor: '#e9ecef',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                border: '1px solid #ced4da'
                                            }}>
                                                {key}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security notice */}
                        <div style={{
                            backgroundColor: '#fff3cd',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #ffeaa7',
                            marginTop: props.qrtype === 'printable' ? '20px' : 0
                        }}>
                            <div style={{
                                fontSize: 16,
                                color: '#856404',
                                fontWeight: 'bold',
                                fontFamily: 'Helvetica-Bold',
                                marginBottom: '8px'
                            }}>
                                🔒 KEEP SECURE
                            </div>
                            <div style={{
                                fontSize: 14,
                                color: '#856404',
                                fontFamily: 'Helvetica'
                            }}>
                                Store this vault in a safe private location.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

};

export default PDFVaultBackup;

