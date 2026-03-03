import React, { useState } from 'react';
import Layout from '../components/Layout';
import '../style/index.css';
import '../style/createPage.css';
import '../style/forms.css';
import Navbar from '../components/NavbarTop';
import CreateVault from '../components/CreateVault';
import Footer from '../components/Footer';

function CreatePage() {
    const [isLoading] = useState(false);

    return (
        <Layout>
            <Navbar loggedIn={false} />
            <CreateVault isLoading={isLoading} />
            <Footer />
        </Layout>
    );
}

export default CreatePage;


