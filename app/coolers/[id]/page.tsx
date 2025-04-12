"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Thermometer, Edit, Trash2, AlertTriangle, PlusCircle, WifiOff, Clock} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BatteryStatus } from "@/components/ui/batter-status"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import TemperatureChart from "@/components/temperature-chart"
import type { CoolingUnit, Drug } from "@/lib/types"
import { formatDate } from "@/lib/utils"

// Import the useAuth hook at the top
import { useAuth } from "@/lib/auth-context"
import Header from "@/components/header"

export default function CoolerDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [cooler, setCooler] = useState<CoolingUnit | null>(null)
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUnreachable, setIsUnreachable] = useState(false)

  // Inside the CoolerDetailsPage component, add the useAuth hook
  const { isAdmin } = useAuth()

  const fetchCoolerDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/cooling-units/${params.id}`)
      if (!response.ok) throw new Error("Failed to fetch cooler details")
      const data = await response.json()

      // Check if cooler is unreachable
      const lastUpdated = data.lastUpdatedTemperature ? new Date(data.lastUpdatedTemperature) : null
      const unreachable = lastUpdated ? new Date().getTime() - lastUpdated.getTime() > 60000 * 3 : false
      setIsUnreachable(unreachable)

      // Process drugs to update their status based on the new rules
      if (data.drugs) {
        const now = new Date()

        // Update drug status based on expiration and temperature
        const processedDrugs = data.drugs.map((drug: Drug) => {
          // Check expiration
          const isExpired = new Date(drug.expirationDate) < now

          // Check if unusable due to temperature
          let isUnusable = false
          if (drug.temperatureExceededSince) {
            const exceededSince = new Date(drug.temperatureExceededSince)
            const hoursExceeded = (now.getTime() - exceededSince.getTime()) / (1000 * 60 * 60)
            isUnusable = hoursExceeded > drug.unsuitableTimeThreshold
          }

          // Check if temperature is currently too high
          const temperatureWarning = data.currentTemperature > drug.maxTemperature

          return {
            ...drug,
            isExpired,
            isUnusable,
            temperatureWarning,
          }
        })

        setDrugs(processedDrugs)
      } else {
        setDrugs([])
      }

      setCooler(data)
    } catch (error) {
      console.error("Error fetching cooler details:", error)
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchCoolerDetails()

    // Set up polling every minute
    const intervalId = setInterval(() => {
      fetchCoolerDetails()
    }, 1000) // 1000 ms = 1 second

    return () => clearInterval(intervalId)
  }, [fetchCoolerDetails])

  const handleDisableToggle = async () => {
    if (!cooler) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/cooling-units/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disabled: !cooler.disabled,
        }),
      })

      if (!response.ok) throw new Error("Failed to update cooler")

      const updatedCooler = await response.json()
      setCooler(updatedCooler)
    } catch (error) {
      console.error("Error updating cooler:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteCooler = async () => {
    if (!window.confirm("Are you sure you want to delete this cooler?")) return

    try {
      const response = await fetch(`/api/cooling-units/${params.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete cooler")

      router.push("/")
    } catch (error) {
      console.error("Error deleting cooler:", error)
    }
  }

  const handleDeleteDrug = async (drugId: string) => {
    if (!window.confirm("Are you sure you want to delete this drug?")) return

    try {
      const response = await fetch(`/api/drugs/${drugId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete drug")

      // Refresh the cooler details to update the drug list
      fetchCoolerDetails()
    } catch (error) {
      console.error("Error deleting drug:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading cooler details...</div>
        </div>
      </div>
    )
  }

  if (!cooler) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-lg mb-4">Cooler not found</p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Check if any drug has a temperature warning
  const hasTemperatureWarning = drugs.some((drug) => drug.temperatureWarning)

  // Update the return statement to include the Header component
  return (
    <>
      <Header />
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Cooler Details: {cooler.coolerModel}</h1>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Cooler Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Thermometer className="h-5 w-5 mr-2 text-muted-foreground" />
                      <span className="text-lg font-medium">Current Temperature:</span>
                    </div>
                    <span
                      className={`text-lg font-bold ${hasTemperatureWarning ? "text-red-500" : cooler.currentTemperature > 8 ? "text-amber-500" : ""
                        }`}
                    >
                      {cooler.currentTemperature}°C
                      {hasTemperatureWarning && <AlertTriangle className="h-4 w-4 ml-1 text-red-500" />}
                    </span>
                  </div>
                  
                  <div className="flex items-center mb-2">
                    <BatteryStatus
                      batteryLevel={cooler.batteryLevel}
                    />
                  </div>


                  {cooler.lastUpdatedTemperature && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      Last Updated: {new Date(cooler.lastUpdatedTemperature).toLocaleString()}
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Vendor</p>
                    <p>{cooler.vendor}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Address</p>
                    <p>{cooler.address}</p>
                  </div>

                  {cooler.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p>{cooler.description}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <div className="flex flex-col gap-2">
                      {isUnreachable && (
                        <Badge
                          variant="outline"
                          className="bg-purple-600 text-white hover:bg-purple-700 flex items-center"
                        >
                          <WifiOff className="h-3 w-3 mr-1" /> Unreachable
                        </Badge>
                      )}
                      {hasTemperatureWarning && (
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
                          <AlertTriangle className="h-3 w-3 mr-1" /> Battery Warning
                        </Badge>
                      )}
                      {!cooler.availability && <Badge variant="destructive">Unavailable</Badge>}
                      {cooler.disabled && (
                        <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700">
                          Disabled
                        </Badge>
                      )}
                      {!isUnreachable && !hasTemperatureWarning && !cooler.batteryWarning && cooler.availability && !cooler.disabled && (
                        <Badge variant="secondary" className="bg-green-500 hover:bg-green-600">
                          All is Well
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="disabled"
                        checked={cooler.disabled}
                        onCheckedChange={handleDisableToggle}
                        disabled={isUpdating}
                      />
                      <Label htmlFor="disabled">Disable Cooler</Label>
                    </div>
                  )}

                  {/* In the cooler information card, update the buttons section */}
                  {/* Find the div with the flex gap-2 pt-4 class and replace it with: */}
                  {isAdmin && (
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/coolers/${cooler._id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Link>
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDeleteCooler}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {/* In the Stored Drugs card header, update the Add Drug button */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Stored Drugs</CardTitle>
                  {isAdmin && (
                    <Button size="sm" asChild>
                      <Link href={`/coolers/${cooler._id}/add-drug`}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Drug
                      </Link>
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {/* In the "No drugs stored" section, update the Add Drug button */}
                  {drugs.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No drugs stored in this cooler</p>
                      {isAdmin && (
                        <Button asChild>
                          <Link href={`/coolers/${cooler._id}/add-drug`}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Drug
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {drugs.map((drug) => (
                        <div key={drug._id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-lg">{drug.name}</h3>
                            <div className="flex flex-col gap-1 items-end">
                              {drug.temperatureWarning && (
                                <Badge
                                  variant="outline"
                                  className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 flex items-center"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Temperature Warning
                                </Badge>
                              )}
                              {drug.isUnusable && (
                                <Badge variant="destructive" className="flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Unusable
                                </Badge>
                              )}
                              {drug.isExpired && <Badge variant="destructive">Expired</Badge>}
                              {!drug.isUnusable &&
                                !drug.isExpired &&
                                new Date(drug.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                                  <Badge variant="outline" className="text-orange-500 border-orange-500">
                                    Expiring Soon
                                  </Badge>
                                )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Vendor:</span> {drug.vendor}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expiration:</span>{" "}
                              {formatDate(drug.expirationDate)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Temperature:</span> {drug.maxTemperature}°C
                            </div>
                            <div>
                              <span className="text-muted-foreground">Unsuitable Threshold:</span>{" "}
                              {drug.unsuitableTimeThreshold}h
                            </div>
                            <div>
                              <span className="text-muted-foreground">Packages:</span> {drug.numberOfPackages || 1}
                            </div>
                            {drug.temperatureExceededSince && (
                              <div>
                                <span className="text-muted-foreground">Temperature Exceeded Since:</span>{" "}
                                {formatDate(drug.temperatureExceededSince.toString())}
                              </div>
                            )}
                          </div>

                          {drug.specifications && drug.specifications.length > 0 && (
                            <>
                              <Separator className="my-2" />
                              <div className="mt-2">
                                <span className="text-sm text-muted-foreground">Specifications:</span>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  {drug.specifications.map((spec, index) => (
                                    <div key={index} className="text-sm">
                                      <span className="text-muted-foreground">{spec.name}:</span> {spec.value}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          {/* For each drug, update the edit/delete buttons */}
                          {/* Find the div with the flex gap-2 mt-3 class and replace it with: */}
                          {isAdmin && (
                            <div className="flex gap-2 mt-3">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/drugs/${drug._id}/edit`}>
                                  <Edit className="mr-2 h-3 w-3" /> Edit
                                </Link>
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteDrug(drug._id)}>
                                <Trash2 className="mr-2 h-3 w-3" /> Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Temperature Chart */}
          <div className="mt-6 w-full">
            <TemperatureChart
              coolerId={params.id}
              maxTemperature={drugs.length > 0 ? Math.min(...drugs.map((drug) => drug.maxTemperature)) : undefined}
            />
          </div>
        </div>
      </div>
    </>
  )
}

