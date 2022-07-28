import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // turn strict mode off as it causes useEffect to be called twice,
  // see issue https://github.com/facebook/react/issues/24455
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);

