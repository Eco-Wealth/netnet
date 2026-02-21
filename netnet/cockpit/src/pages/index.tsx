import React from 'react';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { spacing, typography, colors } from '../styles/design-tokens';

export default function Home(){
  return (
    <div style={{minHeight:'100vh',background:colors.background,color:colors.foreground,fontFamily:typography.fontFamily}}>
      <Header />
      <main style={{maxWidth:1000,margin:'24px auto',padding: spacing.md}}>
        <section style={{marginBottom: spacing.lg}}>
          <h1 style={{fontSize: '28px',margin:'0 0 8px 0'}}>Welcome to Netnet</h1>
          <p style={{margin:0,color:colors.muted}}>A simple control surface for running, monitoring, and monetizing automation jobs.</p>
        </section>

        <section style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap: spacing.md}}>
          <div style={{padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <h3 style={{margin:'0 0 8px 0'}}>Dashboard</h3>
            <p style={{margin:0,color:colors.muted}}>Overview of recent activity, revenue, and system health.</p>
          </div>
          <div style={{padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <h3 style={{margin:'0 0 8px 0'}}>Jobs</h3>
            <p style={{margin:0,color:colors.muted}}>Create, run, and inspect jobs with simple controls.</p>
          </div>
          <div style={{padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <h3 style={{margin:'0 0 8px 0'}}>Metrics</h3>
            <p style={{margin:0,color:colors.muted}}>View usage, costs, and revenue trends.</p>
          </div>
        </section>

        <section style={{marginTop:spacing.lg}}>
          <h2 style={{fontSize:20,margin:'0 0 8px 0'}}>Quick Actions</h2>
          <div style={{display:'flex',gap:spacing.sm}}>
            <button style={{padding:'8px 12px',borderRadius:6,background:colors.info,color:'#fff',border:'none'}}>Create Job</button>
            <button style={{padding:'8px 12px',borderRadius:6,background:'#e6eef6',color:colors.foreground,border:'none'}}>Open Dashboard</button>
          </div>
        </section>
      </main>
    </div>
  );
}
