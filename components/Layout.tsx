import Head from 'next/head';
import Link from 'next/link';
import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'before-server' }: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="before-server" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="header">
        <div className="container">
          <h1>before-server</h1>
        </div>
      </header>
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--light-text)' }}>
            © {new Date().getFullYear()} before-server
          </p>
        </div>
      </footer>
    </>
  );
}