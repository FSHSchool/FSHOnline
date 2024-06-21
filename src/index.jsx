import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import AppRouter from './AppRouter';
import { HashRouter } from 'react-router-dom';

ReactDOM.render(
  <React.StrictMode>
    <HashRouter basename="/">
      <AppRouter />
    </HashRouter>
  </React.StrictMode>,
  document.getElementById('root')
);
