"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { Drug } from "@/lib/types"

const formSchema = z.object({
  name: z.string().min(2, "Drug name is required"),
  vendor: z.string().min(2, "Vendor is required"),
  expirationDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
  maxTemperature: z.string().refine((val) => !isNaN(Number.parseFloat(val)), {
    message: "Max temperature must be a number",
  }),
  unsuitableTimeThreshold: z
    .string()
    .refine((val) => !isNaN(Number.parseInt(val, 10)) && Number.parseInt(val, 10) > 0, {
      message: "Unsuitable time threshold must be a positive number",
    }),
  numberOfPackages: z.string().refine((val) => !isNaN(Number.parseInt(val, 10)) && Number.parseInt(val, 10) > 0, {
    message: "Number of packages must be a positive number",
  }),
  specifications: z.array(
    z.object({
      name: z.string().min(1, "Specification name is required"),
      value: z.string().min(1, "Specification value is required"),
    }),
  ),
})

type FormValues = z.infer<typeof formSchema>

export default function EditDrugPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [drug, setDrug] = useState<Drug | null>(null)
  const [isUnusable, setIsUnusable] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      vendor: "",
      expirationDate: "",
      maxTemperature: "",
      unsuitableTimeThreshold: "",
      numberOfPackages: "",
      specifications: [{ name: "", value: "" }],
    },
  })

  useEffect(() => {
    async function fetchDrug() {
      try {
        const response = await fetch(`/api/drugs/${params.id}`)
        if (!response.ok) throw new Error("Failed to fetch drug")

        const drugData = await response.json()
        setDrug(drugData)
        setIsUnusable(drugData.unusable)

        // Format the date for the input field
        const expirationDate = new Date(drugData.expirationDate)
        const formattedDate = expirationDate.toISOString().split("T")[0]

        // Set form values
        form.reset({
          name: drugData.name,
          vendor: drugData.vendor,
          expirationDate: formattedDate,
          maxTemperature: drugData.maxTemperature.toString(),
          unsuitableTimeThreshold: drugData.unsuitableTimeThreshold.toString(),
          numberOfPackages: drugData.numberOfPackages?.toString() || "1",
          specifications: drugData.specifications?.length > 0 ? drugData.specifications : [{ name: "", value: "" }],
        })
      } catch (error) {
        console.error("Error fetching drug:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDrug()
  }, [params.id, form])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      // Filter out empty specifications
      const filteredSpecs = values.specifications.filter((spec) => spec.name.trim() !== "" && spec.value.trim() !== "")

      const response = await fetch(`/api/drugs/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          vendor: values.vendor,
          expirationDate: new Date(values.expirationDate).toISOString(),
          maxTemperature: Number.parseFloat(values.maxTemperature),
          unsuitableTimeThreshold: Number.parseInt(values.unsuitableTimeThreshold, 10),
          numberOfPackages: Number.parseInt(values.numberOfPackages, 10),
          specifications: filteredSpecs,
          // We don't update the unusable flag here as it's handled by the system
        }),
      })

      if (!response.ok) throw new Error("Failed to update drug")

      // Navigate back to the cooler details page
      if (drug?.coolingUnitId) {
        router.push(`/coolers/${drug.coolingUnitId}`)
      } else {
        router.push("/")
      }
    } catch (error) {
      console.error("Error updating drug:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addSpecification = () => {
    const currentSpecs = form.getValues().specifications
    form.setValue("specifications", [...currentSpecs, { name: "", value: "" }])
  }

  const removeSpecification = (index: number) => {
    const currentSpecs = form.getValues().specifications
    if (currentSpecs.length > 1) {
      form.setValue(
        "specifications",
        currentSpecs.filter((_, i) => i !== index),
      )
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading drug details...</div>
        </div>
      </div>
    )
  }

  if (!drug) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-lg mb-4">Drug not found</p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/coolers/${drug.coolingUnitId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Drug</h1>
      </div>

      {isUnusable && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This drug has been marked as unusable. Some properties cannot be modified.
          </AlertDescription>
        </Alert>
      )}

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Drug Information</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drug Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter drug name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberOfPackages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Packages</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxTemperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Temperature (°C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unsuitableTimeThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unsuitable Threshold (hours)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>Hours before drug becomes unusable at unsuitable temperature</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel>Specifications</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
                    <Plus className="h-4 w-4 mr-1" /> Add Specification
                  </Button>
                </div>

                {form.getValues().specifications.map((_, index) => (
                  <div key={index} className="flex gap-4 items-start mb-2">
                    <FormField
                      control={form.control}
                      name={`specifications.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Name (e.g., Strength)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`specifications.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Value (e.g., 100mg)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSpecification(index)}
                      disabled={form.getValues().specifications.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Drug
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}

