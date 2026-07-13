export enum ThoughtSchool {
  ShiaJafari = 100,
}

export namespace ThoughtSchool {
  export function fromNameString(str: string) {
    switch (str) {
      case "shia-jafari":
        return ThoughtSchool.ShiaJafari
      default:
        throw new Error(`Unknown thought school: ${str}`)
    }
  }
}
