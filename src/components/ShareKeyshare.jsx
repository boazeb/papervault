import React, {useEffect, useRef, useState} from 'react'
import { Link} from 'react-router-dom'

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {Button} from "react-bootstrap";
import * as htmlToImage from "html-to-image";
import PDFKeyBackup from "../components/PDFKeyBackup";
import  {PDFDownloadLink} from '@react-pdf/renderer';

import '../style/index.css';
import '../style/forms.css';
import '../style/createPage.css';
import {useReactToPrint} from "react-to-print";


function ShareKeyshare(props) {

    const [vaultIdent, setVaultIdent]           = useState([]);
    let [activeSlide, setActiveSlide]           = useState(1);
    const [qrData, setQRdata]                       = useState('');
    const [showPDFKey, setShowPDFKey]               = useState(false);
    const [keyId, setKeyId]                         = useState();
    const refBackupKeyPDF                           = useRef(null);
    const [downloadedKeys, setDownloadedKeys]       = useState([]);

    const handlePrint = useReactToPrint({

        onPrintError: () => {},
        content: () => refBackupKeyPDF.current,
        removeAfterPrint: true,
    });


    return (
        <div className="shareKeyshareWrapper createPageWrapper">
           {props.shares.map((member, i) => {
               return (

                   <div key={'share'+i} style={{marginTop:5,marginBottom:15}} className="shareKeyshareItem">
                       <PDFKeyBackup
                          /* ref={refBackupKeyPDF}*/
                           /*ref={props.refProp.current[i]}*/
                           ref={refBackupKeyPDF.current[i]}
                           vaultIdent={props.vaultIdent}
                           myKey={props.cipherKey}
                           cipherText={props.cipherText}
                           shares={props.shares.length}
                           threshold={props.consensus}
                           vaultName={props.vaultName}
                           description={props.description}
                           keyId={keyId}

                           cipherIV={props.cipherIV}
                           unlockShares={props.unlockShares}
                           vaultUsers={props.vaultUsers}
                           createdTimestamp={props.createdTimestamp}
                           myDecryptedKey={props.shares[i]} />

                       {/*<PDFDownloadLink
                           className={downloadedKeys.includes(i)?'btn btn-success':'btn btn-primary'}
                           disabled={downloadedKeys.includes(i)}
                           document={
                               <PDFKeyBackup
                                   ref={refBackupKeyPDF}
                                   vaultIdent={props.vaultIdent}
                                   myKey={props.cipherKey}
                                   cipherText={props.cipherText}
                                   shares={props.shares.length}
                                   threshold={props.consensus}
                                   vaultName={props.vaultName}
                                   description={props.description}
                                   keyId={keyId}

                                   cipherIV={props.cipherIV}
                                   unlockShares={props.unlockShares}
                                   vaultUsers={props.vaultUsers}
                                   createdTimestamp={props.createdTimestamp}
                                   myDecryptedKey={props.shares[i]} />
                            }
                            fileName={"papervault-key-"+(i+1)+".pdf"}
                       >
                           {({ blob, url, loading, error }) => (loading ? 'Loading...' : ('Download Key #'+(i+1)))}
                       </PDFDownloadLink>*/}

                   </div>
               );
           })}
       </div>
    )

}

export default ShareKeyshare;
