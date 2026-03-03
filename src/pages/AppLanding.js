import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { FaKey, FaLockOpen } from 'react-icons/fa';
import Layout from '../components/Layout';
import NavbarTop from '../components/NavbarTop';
import Footer from '../components/Footer';
import '../style/index.css';
import '../style/layout.css';
import '../style/app-landing.css';

export default function AppLanding() {
    return (
        <Layout>
            <div className="home-page-navbar">
                <NavbarTop loggedIn={false} />
            </div>
            <div className="layoutMain">
                <section className="hero-section-new">
                    <Container>
                        <Row className="align-items-center justify-content-center">
                            <Col lg={8} className="hero-content text-center">
                                <h1 className="hero-title-new">
                                    PaperVault.xyz
                                </h1>
                                <p className="hero-subtitle-new">
                                    Create a vault, or unlock an existing one.
                                </p>
                                <div className="hero-cta-group-new">
                                    <Link to="/create" className="hero-cta-primary-new">
                                        <FaKey className="me-2" />
                                        Create Vault
                                    </Link>
                                    <Link to="/unlock" className="hero-cta-secondary-new">
                                        <FaLockOpen className="me-2" />
                                        Unlock Vault
                                    </Link>
                                </div>

                                <Link to="https://papervault.xyz" className="linkage">
                                    papervault.xyz
                                </Link>
                            </Col>
                        </Row>
                    </Container>
                </section>
            </div>
            <Footer />
        </Layout>
    );
}
