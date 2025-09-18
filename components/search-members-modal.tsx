"use client"

import { forwardRef, useImperativeHandle, useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import SearchMembersModalDesktop from "./search-members-modal-desktop"
import SearchMembersModalMobile from "./search-members-modal-mobile"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

interface SearchMembersModalRef {
  setOpen: (open: boolean) => void
}

const SearchMembersModal = forwardRef<SearchMembersModalRef>((props, ref) => {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  useImperativeHandle(ref, () => ({
    setOpen,
  }))

  const TriggerButton = () => (
    <Button
      onClick={() => setOpen(true)}
      variant="outline"
      className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/30 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm"
    >
      <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
      Buscar Socios
    </Button>
  )

  return (
    <>
      <TriggerButton />
      {isMobile ? (
        <SearchMembersModalMobile open={open} onOpenChange={setOpen} />
      ) : (
        <SearchMembersModalDesktop open={open} onOpenChange={setOpen} />
      )}
    </>
  )
})

SearchMembersModal.displayName = "SearchMembersModal"

export default SearchMembersModal
