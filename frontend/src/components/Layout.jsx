import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from '../styles/components/Layout.module.scss';

function Layout({ children }) {
  return (
    <div className={styles.appContainer}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

export default Layout;
