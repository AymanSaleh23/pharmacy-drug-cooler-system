"use client"

import { useState } from "react"
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

// Update the form schema to include numberOfPackages
const formSchema = z.object({
  name: z.string().min(2, "Drug name is required"),
  vendor: z.string().min(2, "Vendor is required"),
  expirationDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
  maxTemperature: z.string().refine((val) => !isNaN(Number.parseFloat(val)), {
    message: "Max temperature must be a number",
  }),
  unsuitableTimeThreshold: z.string().refine((val) => !isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0, {
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

export default function AddDrugPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update the defaultValues to include numberOfPackages
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      vendor: "",
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Default to 1 year from now
      maxTemperature: "8",
      unsuitableTimeThreshold: "24",
      numberOfPackages: "1",
      specifications: [{ name: "", value: "" }],
    },
  })

  // Add numberOfPackages to the form submission
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      // Filter out empty specifications
      const filteredSpecs = values.specifications.filter((spec) => spec.name.trim() !== "" && spec.value.trim() !== "")

      const response = await fetch(`/api/cooling-units/${params.id}/drugs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          vendor: values.vendor,
          expirationDate: new Date(values.expirationDate).toISOString(),
          maxTemperature: Number.parseFloat(values.maxTemperature),
          unsuitableTimeThreshold: Number.parseFloat(values.unsuitableTimeThreshold),
          numberOfPackages: Number.parseInt(values.numberOfPackages, 10),
          specifications: filteredSpecs,
          unusable: false,
        }),
      })

      if (!response.ok) throw new Error("Failed to add drug")

      router.push(`/coolers/${params.id}`)
    } catch (error) {
      console.error("Error adding drug:", error)
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/coolers/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Add Drug to Cooler</h1>
      </div>

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

              {/* Add the numberOfPackages field to the form UI */}
              {/* Find the div with the grid grid-cols-1 md:grid-cols-3 gap-4 and update it to include numberOfPackages */}
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
                        <Input type="number" step="0.1" {...field} />
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
                Add Drug
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}

