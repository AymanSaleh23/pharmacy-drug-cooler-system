"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, Info, PlusCircle, Thermometer, Package, WifiOff, AlertTriangle, AlarmClock, Flame, ThermometerSnowflake , BatteryMedium, BatteryLow} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BatteryStatus } from "@/components/ui/batter-status"
import AddCoolerDialog from "@/components/add-cooler-dialog"
import type { CoolingUnit } from "@/lib/types"

// Import the useAuth hook at the top
import { useAuth } from "@/lib/auth-context"
import Header from "@/components/header"
import { useRouter } from "next/navigation"
import { getCookie } from "cookies-next"

export default function HomePage() {
  const [coolingUnits, setCoolingUnits] = useState<CoolingUnit[]>([])
  const [isAddCoolerOpen, setIsAddCoolerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Inside the HomePage component, add the useAuth hook
  const { isAdmin } = useAuth()
  const router = useRouter()

  // Add this at the beginning of the HomePage component
  useEffect(() => {
    // If not authenticated, redirect to login
    const authRole = getCookie("auth-role")
    if (!authRole) {
      router.push("/login")
    }
  }, [router])

  const fetchCoolingUnits = useCallback(async () => {
    try {
      const response = await fetch("/api/cooling-units")
      if (!response.ok) throw new Error("Failed to fetch cooling units")
      const data = await response.json()

      // Process the data to check for unreachable coolers and update drug status
      const processedData = data.map((cooler: CoolingUnit) => {
        // Check if cooler is unreachable (last temperature update > 30 seconds ago)
        const lastUpdated = cooler.lastUpdatedTemperature ? new Date(cooler.lastUpdatedTemperature) : null
        const isUnreachable = lastUpdated ? new Date().getTime() - lastUpdated.getTime() > 60000 * 3 : false

        // Process drugs to check expiration and usability based on the new rules
        if (cooler.drugs) {
          const now = new Date()

          // Count expired drugs (expiration date < current date)
          const expiringDrugsCount = cooler.drugs.filter((drug) => new Date(drug.expirationDate) < now).length

          // Count unusable drugs (temperature exceeded for longer than threshold)
          const unusableDrugsCount = cooler.drugs.filter((drug) => {
            if (!drug.temperatureExceededSince) return false

            const exceededSince = new Date(drug.temperatureExceededSince)
            const hoursExceeded = (now.getTime() - exceededSince.getTime()) / (1000 * 60 * 60)

            return hoursExceeded > drug.unsuitableTimeThreshold
          }).length

          // Check if any drug has a temperature warning
          const temperatureWarning = cooler.drugs.some((drug) => cooler.currentTemperature > drug.maxTemperature)

          return {
            ...cooler,
            isUnreachable,
            expiringDrugsCount,
            unusableDrugsCount,
            temperatureWarning,
          }
        }

        return {
          ...cooler,
          isUnreachable,
        }
      })

      setCoolingUnits(processedData)
    } catch (error) {
      console.error("Error fetching cooling units:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoolingUnits()

    // Set up polling every minute
    const intervalId = setInterval(() => {
      fetchCoolingUnits()
    }, 1000) // 1000 ms = 1 second

    return () => clearInterval(intervalId)
  }, [fetchCoolingUnits])

  // Update the return statement to include the Header component
  return (
    <>
      <Header />
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">PharmaSafe Link</h1>
          {isAdmin && (
            <Button onClick={() => setIsAddCoolerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Cooler
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading coolers...</div>
          </div>
        ) : coolingUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/40">
            <p className="text-lg mb-4">No coolers found</p>
            {isAdmin && (
              <Button onClick={() => setIsAddCoolerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Cooler
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coolingUnits.map((cooler) => (
              <Card
                key={cooler._id}
                className={
                  cooler.disabled
                    ? "border-blue-500"
                    : (
                      cooler.isUnreachable ||
                      cooler.temperatureWarning ||
                      cooler.batteryWarning ||
                      !cooler.availability ||
                      cooler.unusableDrugsCount > 0 ||
                      cooler.expiringDrugsCount > 0
                    )
                      ? "border-orange-500"
                      : "border-green-500"
                }>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle>{cooler.coolerModel}</CardTitle>
                    <div className="flex flex-col gap-1 items-end">
                      {cooler.isUnreachable && (
                        <Badge
                          variant="outline"
                          className="bg-purple-600 text-white hover:bg-purple-700 flex items-center"
                        >
                          <WifiOff className="h-3 w-3 mr-1" /> Unreachable
                        </Badge>
                      )}
                      {!cooler.availability && <Badge variant="destructive">Unavailable</Badge>}
                      {cooler.disabled && (
                        <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700">
                          Disabled
                        </Badge>
                      )}
                      {cooler.temperatureWarning && (
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 flex items-center"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" /> Temperature Warning
                        </Badge>
                      )}
                      {cooler.batteryWarning && (
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 flex items-center"
                        >
                          <BatteryLow className="h-3 w-3 mr-1" /> Battery Warning
                        </Badge>
                      )}
                      {cooler.drugs.filter((drug) => new Date(drug.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 flex items-center"
                          >
                          {cooler.drugs.filter((drug) => new Date(drug.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}
                          <AlarmClock className="h-3 w-3 mr-1" /> Expiring Soon
                        </Badge>
                      )}
                      {cooler.unusableDrugsCount > 0 && (
                        <Badge variant="secondary" className="bg-orange-500 hover:bg-orange-600">
                          {cooler.unusableDrugsCount}  
                          <Flame className="h-3 w-3 mr-1" /> Unusable
                        </Badge>
                      )}
                      {cooler.expiringDrugsCount > 0 && (
                        <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">
                          {cooler.expiringDrugsCount} Expired
                        </Badge>
                      )}
                        
                      {!cooler.isUnreachable &&
                        !cooler.temperatureWarning &&
                        !cooler.batteryWarning &&
                        cooler.availability &&
                        !cooler.disabled &&
                        cooler.unusableDrugsCount === 0 &&
                        cooler.expiringDrugsCount === 0 && 
                        cooler.batteryLevel < 35 && (
                          <Badge variant="secondary" className="bg-green-500 hover:bg-green-600">
                           <BatteryMedium className="h-3 w-3 mr-1" /> Battery below average
                          </Badge>
                        )}
                         
                      {!cooler.isUnreachable &&
                        !cooler.temperatureWarning &&
                        !cooler.batteryWarning &&
                        cooler.availability &&
                        !cooler.disabled &&
                        cooler.unusableDrugsCount === 0 &&
                        cooler.expiringDrugsCount === 0 && (
                          <Badge variant="secondary" className="bg-green-500 hover:bg-green-600">
                            <ThermometerSnowflake className="h-3 w-3 mr-1" /> All is Well
                          </Badge>
                        )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-2">
                    <Thermometer className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span
                      className={`text-lg font-medium ${cooler.temperatureWarning
                          ? "text-red-500"
                          : cooler.currentTemperature > 8
                            ? "text-amber-500"
                            : ""
                        }`}
                    >
                      {cooler.currentTemperature}°C
                    </span>
                    {cooler.lastUpdatedTemperature && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Updated: {new Date(cooler.lastUpdatedTemperature).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                   
                  <div className="flex items-center mb-2">
                    <BatteryStatus
                      batteryLevel={cooler.batteryLevel}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">{cooler.vendor}</p>
                  <p className="text-sm text-muted-foreground truncate">{cooler.address}</p>
                  <div className="mt-2 flex items-center">
                    <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {cooler.totalDrugsCount || 0} {cooler.totalDrugsCount === 1 ? "Drug" : "Drugs"}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <Button variant="outline" asChild>
                    <Link href={`/coolers/${cooler._id}`}>
                      <Info className="mr-2 h-4 w-4" /> Details
                    </Link>
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" asChild>
                      <Link href={`/coolers/${cooler._id}/add-drug`}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Drug
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {isAdmin && (
          <AddCoolerDialog
            open={isAddCoolerOpen}
            onOpenChange={setIsAddCoolerOpen}
            onCoolerAdded={(newCooler) => setCoolingUnits([...coolingUnits, newCooler])}
          />
        )}
      </div>
    </>
  )
}