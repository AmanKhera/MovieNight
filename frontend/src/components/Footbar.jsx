import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Footnote() {
  const navigate = useNavigate();

  
  const bar = {
    position: 'relative',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 60,                       // bar height
    background: '#240046',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    fontFamily: "'Patua One', serif",
  };

  const group = { display: 'flex', gap: 24 };

  const btn = {
    all: 'unset',                     
    cursor: 'pointer',
    padding: '8px 14px',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 500,
    textAlign: 'center',
    transition: 'background .25s',
  };

  const hoverBg = '#10002B';          


  const Item = ({ label, path }) => (
    <button
      style={btn}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onClick={() => navigate(path)}
    >
      {label}
    </button>
  );


  return (
    <footer style={bar}>
      <div style={group}>
        <Item label=""   path="/about"    />
        <Item label=""   path="/terms"    />
        <Item label="" path="/privacy"  />
        <Item label="" path="/contact"  />
      </div>
    </footer>
  );
}
