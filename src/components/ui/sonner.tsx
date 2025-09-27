"use client"

import { Toaster as SonnerToaster } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <SonnerToaster
      position="bottom-right" // Position toasts in the bottom-right corner
      richColors // Use rich colors for different toast types (success, error, info)
      duration={5000} // Set default duration to 5 seconds
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }