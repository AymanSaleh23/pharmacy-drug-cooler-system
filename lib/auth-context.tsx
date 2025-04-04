"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getCookie, setCookie, deleteCookie } from "cookies-next"

type UserRole = "user" | "admin" | null

interface AuthContextType {
  role: UserRole
  login: (password: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null)
  const router = useRouter()

  // Check for existing auth cookie on mount
  useEffect(() => {
    const storedRole = getCookie("auth-role") as UserRole | undefined
    if (storedRole) {
      setRole(storedRole)
    }
  }, [])

  const login = async (password: string): Promise<boolean> => {
    // Simple password check - in a real app, this would be a server-side API call
    if (password === "user123") {
      setRole("user")
      setCookie("auth-role", "user", { maxAge: 60 * 60 * 24 }) // 1 day
      return true
    } else if (password === "admin123") {
      setRole("admin")
      setCookie("auth-role", "admin", { maxAge: 60 * 60 * 24 }) // 1 day
      return true
    }
    return false
  }

  const logout = () => {
    setRole(null)
    deleteCookie("auth-role")
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ role, login, logout, isAdmin: role === "admin" }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

