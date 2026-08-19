import { useState, useEffect } from 'react';

export default function LandingPage({ onNavigate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('bay_equipment') || '[]');
      if (data.length > 0) {
        const sections = new Set(data.map(item => item.section || item.bay)).size;
        setStats({ items: data.length, sections });
      }
    } catch (e) { /* no stats */ }
  }, []);

  const features = [
    {
      icon: '⚡',
      title: 'Build & Define Scope',
      desc: 'Add sections, feeders, and equipment using 13 preset templates covering 56 equipment types and 234+ tests. Configure once, export everywhere.'
    },
    {
      icon: '📊',
      title: 'Track & Witness',
      desc: 'Mark tests as Tested, Witnessed, and Closed. Progress feeds directly into your COR. Never lose track of where you are.'
    },
    {
      icon: '📤',
      title: 'Export Anywhere',
      desc: 'One-click COR Excel with live formulas, Asana projects with custom fields, or Procore bulk upload files. All from the same scope.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        padding: '80px 40px 60px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ width: 40, height: 4, background: '#FF9900', borderRadius: 2, margin: '0 auto 24px' }} />
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#ffffff', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          HV Substation Commissioning Tool
        </h1>
        <p style={{ fontSize: 16, color: '#94a3b8', margin: '0 auto 32px', maxWidth: 560, lineHeight: 1.6 }}>
          One tool for your entire commissioning workflow — from scope definition to project close-out.
        </p>
        <button
          onClick={() => onNavigate('builder')}
          style={{
            background: '#FF9900', color: '#fff', border: 'none', borderRadius: 8,
            padding: '14px 36px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 4px 14px rgba(255,153,0,0.3)'
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(255,153,0,0.4)'; }}
          onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(255,153,0,0.3)'; }}
        >
          Get Started
        </button>
      </div>

      {/* Feature Cards */}
      <div style={{ background: '#f1f5f9', padding: '48px 40px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12,
              padding: 28, transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default'
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 10px' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        {stats && (
          <div style={{
            marginTop: 32, textAlign: 'center', padding: '14px 24px',
            background: '#e2e8f0', borderRadius: 8, maxWidth: 600, margin: '32px auto 0',
            fontSize: 13, color: '#475569'
          }}>
            You have <strong>{stats.items}</strong> equipment items across <strong>{stats.sections}</strong> sections
          </div>
        )}

        {/* Footer CTA */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <button
            onClick={() => onNavigate('builder')}
            style={{
              background: 'transparent', color: '#FF9900', border: '2px solid #FF9900',
              borderRadius: 8, padding: '12px 32px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => { e.target.style.background = '#FF9900'; e.target.style.color = '#fff'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#FF9900'; }}
          >
            Get Started →
          </button>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>Built by ACx Team, Amazon Dublin</p>
        </div>
      </div>
    </div>
  );
}
