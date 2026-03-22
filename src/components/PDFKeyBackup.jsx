import React from 'react'
import moment from 'moment-timezone';
import QRCode from 'qrcode.react';
import QRCode2 from 'qrcode'
import {StyleSheet, Image } from '@react-pdf/renderer';

const PDFKeyBackup = (props) => {

    const formatTime = (timestamp) => {
        return moment.tz(new Date(timestamp*1000), 'YYYY-MM-DD', moment.tz.guess()).format('YYYY-MM-DD HH:mm:ss')
    };

    const defaultColors = ['#FF0000', '#0000FF', '#008000'];
    const effectiveColors = (props.vaultColors && props.vaultColors.length > 0)
        ? props.vaultColors 
        : defaultColors;

    const styles = StyleSheet.create({
        printPage: {
            flex: 0,
            flexGrow: 0,
            width: '100%',
            minHeight: '297mm', // A4 height - ensures inner height:100% resolves on mobile print
            maxHeight: '297mm', // A4 height
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
            overflow: 'hidden',
        },
        downloadPage: {
            flex: 0, 
            flexGrow: 0,
            width: '100%',
            maxHeight: '297mm', // A4 height
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
            overflow: 'hidden',
        },
        printPageBreak: {
            pageBreakBefore: 'always',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
            breakBefore: 'page',
        },
        page: {
            backgroundColor: '#fff',
            width: '100%',
            height: '100%',
            padding: 0,
            display: props.qrtype === 'downloadable' ? 'flex' : 'block',
            ...(props.qrtype === 'downloadable' ? { flexDirection: 'column', flex: 0, flexGrow: 0 } : {}),
            position: 'relative',
            boxSizing: 'border-box',
            overflow: 'hidden',
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
        QRWrapperMiddle: {
            display: 'flex',
            flexDirection: 'column',
            flex: 0,
            width: '100%',
            marginTop: props.qrtype === 'downloadable' ? 10 : 50,
            marginBottom: 0,
            height: 'auto',
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
            marginBottom: 15,
        },
        QRCodeContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            padding: props.qrtype === 'downloadable' ? '15px' : '10px',
            height: props.qrtype === 'downloadable' ? 280 : 300,
            width: props.qrtype === 'downloadable' ? 280 : 300,
            margin: '0',
            border: '1px dotted #ccc',
            borderRadius: '8px',
        },
        QRImage: {
            width: 250,
            height: 250,
            padding: 10,
            backgroundColor: '#fff',
            objectFit: 'contain',
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
                    paddingRight: '30px',
                    position: 'relative'
                  }
                : {
                    transform: 'rotate(-90deg)',
                    paddingRight: '0px',
                    position: 'absolute',
                    right: '-80px',
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
                    left: '-80px',
                    width: '100px',
                    textAlign: 'center'
                  }
            )
        },
        asciiDetailsSection: {
            fontFamily: 'monospace',
            whiteSpace: 'pre',
        },
        keyAliasStyle: {
            padding: '0 4px',
            border: '0.5px solid #888',
            borderRadius: '4px',
            backgroundColor: '#f8f9fa',
            fontWeight: 'normal',
            whiteSpace: 'nowrap',
            position: 'relative',
            display: 'inline-block'
        },
    });

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

    // Generate QR code
    let canvas;
    let qrdata = JSON.stringify({
        ident: props.keyAlias,
        key: props.myDecryptedKey
    });

    canvas = document.createElement('canvas');
    QRCode2.toCanvas(canvas, qrdata, {
        errorCorrectionLevel: 'M',  // Changed from H to M for better balance
        width: 250,  // Reduced from default to 250
        margin: 2
    });
    const qr = canvas.toDataURL();

    return (
        <div style={{
                 ...(props.qrtype === 'printable' ? styles.printPage : styles.downloadPage),
                 ...(props.qrtype === 'printable' ? styles.printPageBreak : {})
             }}>
            <div style={styles.page}>
                {/* Main content area with QR code in top-left */}
                <div style={{
                    ...(props.qrtype === 'downloadable'
                        ? { display: 'flex', flexDirection: 'row', gap: '40px', flex: 1 }
                        : { overflow: 'hidden' }),
                    padding: '20px',
                }}>
                    {/* Left side - QR Code */}
                    <div style={{
                        ...(props.qrtype === 'downloadable'
                            ? { flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'center' }
                            : { float: 'left', width: '320px', marginRight: '40px', textAlign: 'center' }),
                    }}>
                        <div style={styles.QRCodeContainer}>
                            {props.qrtype === 'printable' ?
                                <QRCode 
                                    id='qrcodekey' 
                                    value={qrdata} 
                                    size={250}
                                    level="M"
                                    includeMargin={true}
                                />
                                : null
                            }
                            {props.qrtype === 'downloadable' ?
                                <Image 
                                    src={qr} 
                                    style={styles.QRImage}
                                    alt={`QR Code for Key: ${props.keyAlias}`}
                                />
                                : null
                            }
                        </div>
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
                            ? { flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }
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
                                margin: 0,
                                fontFamily: 'Helvetica-Bold',
                                float: 'left'
                            }}>
                                PAPERVAULT.XYZ KEY
                            </h1>
                            <div style={{ float: 'right' }}>{renderColorBoxes()}</div>
                        </div>
                        
                        {/* ASCII art */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '20px',
                            marginTop: props.qrtype === 'printable' ? '20px' : 0
                        }}>
                            <div style={{
                                fontFamily: 'monospace',
                                fontSize: 11,
                                color: '#2c3e50',
                                lineHeight: 1.1,
                                whiteSpace: 'pre',
                                display: 'inline-block',
                                textAlign: 'left'
                            }}>
                                {` ██╗  ██╗███████╗██╗   ██╗
 ██║ ██╔╝██╔════╝╚██╗ ██╔╝
 █████╔╝ █████╗   ╚████╔╝ 
 ██╔═██╗ ██╔══╝    ╚██╔╝  
 ██║  ██╗███████╗   ██║   
 ╚═╝  ╚═╝╚══════╝   ╚═╝   `}
                            </div>
                            <div style={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                color: '#0d6efd',
                                marginTop: 10,
                                fontFamily: 'Helvetica-Bold',
                                textAlign: 'center'
                            }}>
                                {props.keyAlias}
                            </div>
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
                                How to Use This Key
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
                                <li>Scan your vault QR code</li>
                                <li>Scan key(s) required to unlock vault</li>
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

                        {/* Key details */}
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
                                Key Details
                            </h3>
                            <div style={{
                                fontSize: 14,
                                color: '#495057',
                                fontFamily: 'Helvetica',
                                lineHeight: 1.5
                            }}>
                                <div><strong>Vault:</strong> {props.vaultName}</div>
                                <div><strong>Key Name:</strong> {props.keyAlias}</div>
                                <div><strong>Created:</strong> {formatTime(props.createdTimestamp)}</div>
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
                                Store this key in a safe private location.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PDFKeyBackup;
