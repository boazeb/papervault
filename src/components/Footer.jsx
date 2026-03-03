import React from 'react';
import '../style/footer.css';

const WEBSITE_URL = 'https://papervault.xyz';

export default function Footer() {
    return (
        <footer className="footerContainer">
            <div className="footerContent">
                <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="footerLink">
                    papervault.xyz
                </a>
            </div>
        </footer>
    );
}
