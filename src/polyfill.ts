import DeviceCMYK from './device-cmyk';
import ICCProfile from './icc-profile';

declare global {
  interface Window {
    DeviceCMYK: typeof DeviceCMYK;
    ICCProfile: typeof ICCProfile;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const meta = document.querySelector('meta[name="x-icc-profile"]');
  let profile: ICCProfile | undefined;

  if (meta) {
    profile = await ICCProfile.open(meta.getAttribute('content')!);
  }

  DeviceCMYK.init(profile);

  window.DeviceCMYK = DeviceCMYK;
  window.ICCProfile = ICCProfile;
});
