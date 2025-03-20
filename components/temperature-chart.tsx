"use client"

import { useState, useEffect } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js"
import "chartjs-adapter-date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TemperatureRecord } from "@/lib/types"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale)

interface TemperatureChartProps {
  coolerId: string
}

export default function TemperatureChart({ coolerId }: TemperatureChartProps) {
  const [temperatureData, setTemperatureData] = useState<TemperatureRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7") // Default to 7 days

  useEffect(() => {
    const fetchTemperatureHistory = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/cooling-units/${coolerId}/temperature-history?days=${timeRange}`)
        if (!response.ok) throw new Error("Failed to fetch temperature history")
        const data = await response.json()
        setTemperatureData(data)
      } catch (error) {
        console.error("Error fetching temperature history:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemperatureHistory()

    // Set up polling every minute
    const intervalId = setInterval(() => {
      fetchTemperatureHistory()
    }, 60000) // 60000 ms = 1 minute

    return () => clearInterval(intervalId)
  }, [coolerId, timeRange])

  const chartData = {
    datasets: [
      {
        label: "Temperature (°C)",
        data: temperatureData.map((record) => ({
          x: new Date(record.timestamp),
          y: record.temperature,
        })),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: timeRange === "1" ? "hour" : timeRange === "7" ? "day" : "week",
        },
        title: {
          display: true,
          text: "Time",
        },
      },
      y: {
        title: {
          display: true,
          text: "Temperature (°C)",
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Temperature History",
      },
    },
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Temperature History</CardTitle>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 Hours</SelectItem>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading temperature data...</div>
          </div>
        ) : temperatureData.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">No temperature data available</div>
          </div>
        ) : (
          <div className="h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

