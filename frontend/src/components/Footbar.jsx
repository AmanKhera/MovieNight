import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Footer used to pad bottom of page
 */
export default function Footnote() {  
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




  return (
    <footer style={bar}>
    </footer>
  );
}
