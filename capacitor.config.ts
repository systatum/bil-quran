import { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.bilquran.app",
  appName: "BilQuran",
  webDir: "build",
  server: {
    url: "http://192.168.1.4:3000",
    cleartext: true,
  },
}

export default config
