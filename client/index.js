/* global module: true */
import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import App from './App';
import VAPID from './../private/vapid.json';

import './web-app-manifest.json';
import './img/launcher-icon-1x.png';
import './img/launcher-icon-2x.png';
import './img/launcher-icon-4x.png';
import './img/apple-touch-icon-57x57.png';
import './img/apple-touch-icon-60x60.png';
import './img/apple-touch-icon-72x72.png';
import './img/apple-touch-icon-76x76.png';
import './img/apple-touch-icon-114x114.png';
import './img/apple-touch-icon-120x120.png';
import './img/apple-touch-icon-144x144.png';
import './img/apple-touch-icon-152x152.png';
import './img/apple-touch-icon-180x180.png';
import 'worker-loader?name=./qrwork.js!./qrwork.js';
import 'worker-loader?name=./service-worker.js!./service-worker.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./service-worker.js')
    .then(registration => console.log('Starting to register Service worker', registration))
    .catch(err => console.error('Error during Service worker registration', err));
}

ReactDOM.render(<App />, document.getElementById('root'));

if (module.hot) {
  module.hot.accept(function() {
    console.log('Accepting the updated printMe module!');
  });
}
