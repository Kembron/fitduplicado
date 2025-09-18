"use client"
import { useIsMobile } from "@/hooks/use-mobile"
import NewMemberModalMobile from "./new-member-modal-mobile"
import NewMemberModalDesktop from "./new-member-modal-desktop"

function NewMemberModal() {
  const isMobile = useIsMobile()

  return isMobile ? <NewMemberModalMobile /> : <NewMemberModalDesktop />
}

export default NewMemberModal
