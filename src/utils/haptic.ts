import { Capacitor } from "@capacitor/core"
import { Haptics, ImpactStyle } from "@capacitor/haptics"

export async function haptic() {
  if (!Capacitor.isNativePlatform()) return

  try {
    await Haptics.impact({
      style: ImpactStyle.Medium,
    })
  } catch {
    // Ignore errors
  }
}
