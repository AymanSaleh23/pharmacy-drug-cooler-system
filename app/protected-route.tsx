"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
}) {
  const { role, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!role) {
      router.push("/login")
    } else if (adminOnly && !isAdmin) {
      router.push("/")
    }
  }, [role, isAdmin, adminOnly, router])

  if (!role || (adminOnly && !isAdmin)) {
    return null
  }

  return <>{children}</>
}

