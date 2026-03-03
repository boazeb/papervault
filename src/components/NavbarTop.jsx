import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { MdMenu } from 'react-icons/md';
import logoIMG from '../images/papervault-logo-small.png';
import '../style/navbar.css';

const NavbarTop = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    return (
        <div className="navbarWrapper">
            <Container fluid>
                <Navbar
                    expand="md"
                    expanded={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                    className="navbarCustom modern-navbar"
                >
                    <Navbar.Brand href="/" className="nav-brand">
                        <div className="navbarLogo">
                            <img src={logoIMG} alt="PaperVault.xyz logo" />
                            papervault.xyz
                        </div>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="navbar-nav" className="navbar-toggler">
                        <MdMenu fill="#fff" />
                    </Navbar.Toggle>
                    <Navbar.Collapse id="navbar-nav">
                        <Nav className="navbar-nav justify-content-end modern-nav" style={{ width: '100%', paddingRight:20 }}>
                            <Nav.Item className="nav-item">
                                <Link className={'nav-link' + (location.pathname === '/' ? ' active' : '')} to="/">
                                    Home
                                </Link>
                            </Nav.Item>
                            <Nav.Item className="nav-item">
                                <Link className={'nav-link' + (location.pathname === '/unlock' ? ' active' : '')} to="/unlock">
                                    Unlock
                                </Link>
                            </Nav.Item>
                            <Nav.Item className="nav-item" >
                                <Link className={'nav-link' + (location.pathname === '/create' ? ' active' : '')} to="/create">
                                    Create
                                </Link>
                            </Nav.Item>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
            </Container>
        </div>
    );
};

export default NavbarTop;
