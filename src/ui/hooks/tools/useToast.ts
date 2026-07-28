import { Toast } from "@systatum/coneto/toast"

export default function useToast() {
  return {
    successToast: (content: string, title?: string) => {
      Toast.success({
        position: "bottom-center",
        title,
        content,
      })
    },

    errorToast: (content: string, title?: string) => {
      Toast.danger({
        position: "bottom-center",
        title,
        content,
      })
    },
  }
}
