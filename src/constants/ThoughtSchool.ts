export enum ThoughtSchool {
  ShiaJafari = 100,
  SunniSalafi = 200,
  SunniHanafi = 210,
  SunniShafii = 220,
}

export namespace ThoughtSchool {
  export function fromNameString(str: string) {
    switch (str) {
      case "shia-jafari":
        return ThoughtSchool.ShiaJafari
      case "sunni-salafi":
        return ThoughtSchool.SunniSalafi
      case "sunni-hanafi":
        return ThoughtSchool.SunniHanafi
      case "sunni-shafii":
        return ThoughtSchool.SunniShafii
      default:
        throw new Error(`Unknown thought school: ${str}`)
    }
  }
}
