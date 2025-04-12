"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { CoolingUnit } from "@/lib/types"

const formSchema = z.object({
  coolerModel: z.string().min(2, "Cooler model is required"),
  vendor: z.string().min(2, "Vendor is required"),
  address: z.string().min(5, "Address is required"),
  description: z.string().optional(),
  currentTemperature: z.string().refine((val) => !isNaN(Number.parseFloat(val)), {
    message: "Temperature must be a number",
  }),
  availability: z.boolean(),
  disabled: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

export default function EditCoolerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooler, setCooler] = useState<CoolingUnit | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coolerModel: "",
      vendor: "",
      address: "",
      description: "",
      currentTemperature: "",
      availability: true,
      disabled: false,
    },
  })

  useEffect(() => {
    async function fetchCooler() {
      try {
        const response = await fetch(`/api/cooling-units/${params.id}`)
        if (!response.ok) throw new Error("Failed to fetch cooler")

        const coolerData = await response.json()
        setCooler(coolerData)

        // Set form values
        form.reset({
          coolerModel: coolerData.coolerModel,
          vendor: coolerData.vendor,
          address: coolerData.address,
          description: coolerData.description || "",
          availability: coolerData.availability,
          disabled: coolerData.disabled,
        })
      } catch (error) {
        console.error("Error fetching cooler:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCooler()
  }, [params.id, form])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/cooling-units/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coolerModel: values.coolerModel,
          vendor: values.vendor,
          address: values.address,
          description: values.description,
          availability: values.availability,
          disabled: values.disabled,
        }),
      })

      if (!response.ok) throw new Error("Failed to update cooler")

      router.push(`/coolers/${params.id}`)
    } catch (error) {
      console.error("Error updating cooler:", error)
    } finally {
      setIsSubmitting(false)
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/coolers/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Cooling Unit</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Cooler Information</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="coolerModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooler Model</FormLabel>
                    <FormControl>
                      <Input placeholder="XYZ-123" {...field} />
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
                      <Input placeholder="Acme Coolers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter cooler description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col space-y-4">
                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Available</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="disabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Disabled</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Cooler
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}

