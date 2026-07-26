export enum ThoughtSchool {
  ShiaJafari = 100,
  SunniSalafi = 200,
}

export namespace ThoughtSchool {
  export function fromNameString(str: string) {
    switch (str) {
      case "shia-jafari":
        return ThoughtSchool.ShiaJafari
      case "sunni-salafi":
        return ThoughtSchool.SunniSalafi
      default:
        throw new Error(`Unknown thought school: ${str}`)
    }
  }
}
