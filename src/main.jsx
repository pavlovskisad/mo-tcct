import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import MoDivination from './MoDivination.jsx'
import DomiMo from './DomiMo.jsx'

function App() {
  const [route, setRoute] = useState(window.location.hash === '#domimo' ? 'domimo' : 'mo');

  useEffect(() => {
    const onHash = () => {
      setRoute(window.location.hash === '#domimo' ? 'domimo' : 'mo');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goMo = () => {
    window.location.hash = '';
    setRoute('mo');
  };
  const goDomiMo = () => {
    window.location.hash = '#domimo';
    setRoute('domimo');
  };

  if (route === 'domimo') {
    return <DomiMo onBack={goMo} />;
  }
  return <MoDivination onPlayDomiMo={goDomiMo} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
