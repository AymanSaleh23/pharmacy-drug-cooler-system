"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { CoolingUnit } from "@/lib/types"

const formSchema = z.object({
  coolerModel: z.string().min(2, "Cooler model is required"),
  vendor: z.string().min(2, "Vendor is required"),
  address: z.string().min(5, "Address is required"),
  description: z.string().optional(),
})

type AddCoolerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCoolerAdded: (cooler: CoolingUnit) => void
}

export default function AddCoolerDialog({ open, onOpenChange, onCoolerAdded }: AddCoolerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coolerModel: "",
      vendor: "",
      address: "",
      description: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/cooling-units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coolerModel: values.coolerModel,
          vendor: values.vendor,
          address: values.address,
          description: values.description,
          location: {
            type: "Point",
            coordinates: [0, 0], // Default coordinates, will be updated via map pin
          },
          availability: true,
          disabled: false,
          currentTemperature: 4, // Default temperature
          lastUpdatedTemperature: new Date(), // Initialize the lastUpdatedTemperature field
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add cooler")
      }

      const newCooler = await response.json()
      onCoolerAdded(newCooler)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding cooler:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Cooler</DialogTitle>
          <DialogDescription>Enter the details for the new cooling unit.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Input placeholder="Enter cooler description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Cooler
              </Button>
            </DialogFooter>
          </form>
        </Form>
        <div className="text-sm text-muted-foreground mt-2">
          Note: Location will be set by placing a pin on the map in the cooler details page.
        </div>
      </DialogContent>
    </Dialog>
  )
}

