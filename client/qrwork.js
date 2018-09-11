import QrCode from 'qrcode-reader';
import { qrCodeStringToObject } from './utils/qrcode';

self.onmessage = ({ data }) => {
  doWork(data).then(data => self.postMessage(data));
};

function doWork(imageBuffer) {
  return new Promise((resolve /*, reject*/) => {
    // BEGIN MAIN THREAD SOLUTION
    let qr = new QrCode();

    qr.callback = function(error, rawResult) {
      if (error) {
        self.postMessage({ error });
        return;
      }

      let result = qrCodeStringToObject(rawResult.result);

      resolve(result);
    };

    qr.decode(imageBuffer);
  });
}
