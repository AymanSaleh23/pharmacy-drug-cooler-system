export interface CoolingUnit {
  _id: string
  coolerModel: string
  vendor: string
  location: {
    type: string
    coordinates: [number, number]
  }
  address: string
  description?: string
  availability: boolean
  disabled: boolean
  currentTemperature: number
  lastUpdatedTemperature: Date | string
  drugs?: Drug[]
  unusableDrugsCount?: number
  expiringDrugsCount?: number
  totalDrugsCount?: number
  isUnreachable?: boolean
  temperatureWarning?: boolean
  notificationSentForUnreachable: boolean
  notificationSentForUnavailable : boolean
}

export interface Drug {
  _id: string
  name: string
  vendor: string
  specifications: {
    name: string
    value: string
  }[]
  expirationDate: Date
  maxTemperature: number
  unsuitableTimeThreshold: number
  numberOfPackages: number
  unusable: boolean
  temperatureExceededSince?: Date | string | null
  temperatureWarning?: boolean
  notificationSentForUnusable: boolean
  notificationSentForExpired: boolean
  notificationThreeMExp: boolean 
  notificationOneMExp: boolean 
  notificationOneWeekExp: boolean 
}

export interface TemperatureRecord {
  _id?: string
  coolingUnitId: string
  temperature: number
  timestamp: Date | string
}

