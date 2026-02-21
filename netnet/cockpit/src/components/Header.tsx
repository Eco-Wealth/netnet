import React from 'react';
import Link from 'next/link';
import { spacing, typography, colors } from '../styles/design-tokens';

export default function Header(){
  return (
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding: '12px 24px',borderBottom: '1px solid #eef2f7',background: colors.background}}>
      <div style={{display:'flex',alignItems:'center',gap: spacing.md}}>
        <div style={{width:36,height:36,background:colors.info,borderRadius:8}} />
        <div style={{fontFamily: typography.fontFamily,fontSize: '18px',fontWeight:600,color:colors.foreground}}>Netnet</div>
      </div>
      <nav style={{display:'flex',gap: spacing.md,alignItems:'center'}}>
        <Link href="/">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/jobs">Jobs</Link>
        <Link href="/metrics">Metrics</Link>
      </nav>
    </header>
  );
}
