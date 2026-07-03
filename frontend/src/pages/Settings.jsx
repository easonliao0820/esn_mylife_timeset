import React from 'react';
import Layout from '../components/Layout';
import dashStyles from '../styles/Dashboard.module.scss';

function Settings() {
  return (
    <Layout>
      <main className={dashStyles.dashboard}>
        <div className={dashStyles.glassCard}>
          <h2>系統設定</h2>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
            設定功能開發中... 您可以在此調整佈景主題、提醒通知與帳戶資訊。
          </p>
        </div>
      </main>
    </Layout>
  );
}

export default Settings;
