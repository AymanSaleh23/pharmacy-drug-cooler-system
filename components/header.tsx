"use client"

import Link from "next/link"
import { LogOut, User, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export default function Header() {
  const { logout, isAdmin, role } = useAuth()

  if (!role) return null

  return (
    <header className="border-b">
      <div className="container mx-auto py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Pharmacy Drug Cooler System
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isAdmin ? <Shield className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-gray-600" />}
            <span className="font-medium">{isAdmin ? "Admin" : "User"}</span>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
