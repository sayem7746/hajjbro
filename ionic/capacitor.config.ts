import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hajjbro.app',
  appName: 'HajjBro',
  webDir: 'dist',
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          // Folder name differs from the Swift package name, which makes Xcode
          // look up a product that does not exist.
          'capacitor-voice-recorder': {
            symlink: true,
          },
        },
      },
    },
  },
};

export default config;
