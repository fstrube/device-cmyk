import DeviceCMYK from './device-cmyk';
import ICCProfile from './icc-profile';

declare global {
  interface Window {
    DeviceCMYK: typeof DeviceCMYK;
    ICCProfile: typeof ICCProfile;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  window.DeviceCMYK = DeviceCMYK;
  window.ICCProfile = ICCProfile;

  await DeviceCMYK.init();
});
