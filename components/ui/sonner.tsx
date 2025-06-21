import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#0f0f0f',
          border: '1px solid #e5e7eb',
          fontSize: '14px',
          fontWeight: '500',
        },
        duration: 3000,
      }}
      {...props}
    />
  )
}

export { Toaster }
