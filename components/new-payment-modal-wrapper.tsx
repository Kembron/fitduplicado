"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import NewPaymentModal from "./new-payment-modal"
import NewPaymentModalMobile from "./new-payment-modal-mobile"

export default function NewPaymentModalWrapper() {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <Plus className="h-4 w-4 mr-2" />
        Registrar Pago
      </Button>

      {isMobile ? <NewPaymentModalMobile open={open} onOpenChange={setOpen} /> : <NewPaymentModal />}
    </>
  )
}
