"use client"

import { useIsMobile } from "@/components/ui/use-mobile"
import DailyPaymentsDetailedModalMobile from "./daily-payments-detailed-modal-mobile"
import DailyPaymentsDetailedModalDesktop from "./daily-payments-detailed-modal-desktop"

interface DailyPaymentsDetailedModalWrapperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  days?: number
}

export default function DailyPaymentsDetailedModalWrapper({
  open,
  onOpenChange,
  days = 30,
}: DailyPaymentsDetailedModalWrapperProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DailyPaymentsDetailedModalMobile open={open} onOpenChange={onOpenChange} days={days} />
  }

  return <DailyPaymentsDetailedModalDesktop open={open} onOpenChange={onOpenChange} days={days} />
}
