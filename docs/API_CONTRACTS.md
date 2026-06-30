# TravelAI — API Contracts

All Supabase Edge Functions are invoked via:
```
POST https://<SUPABASE_PROJECT>.supabase.co/functions/v1/<function-name>
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json
```

Responses that use mock or estimated data include a `data_label` field:  
- `"[MOCK DATA]"` — static mock, not from a live provider  
- `"[AI ESTIMATE]"` — AI-generated, not confirmed  
- `"[LIVE]"` — from a real-time provider  

---

## 1. `ai-planner`

Generates or regenerates an AI trip itinerary.

### Request
```json
{
  "tripId": "uuid",
  "regenerateDay": 2           // optional — omit to regenerate full trip
}
```

### Response (success)
```json
{
  "status": "complete",
  "tripId": "uuid",
  "data_label": "[AI ESTIMATE]",
  "days": [
    {
      "dayNumber": 1,
      "date": "2025-10-01",
      "theme": "Arrival & Old City",
      "estimatedCostInr": 180000,
      "activities": [
        {
          "sortOrder": 1,
          "title": "Check in to hotel",
          "description": "Settle in and freshen up",
          "locationName": "Hotel XYZ",
          "startTime": "14:00",
          "endTime": "15:00",
          "durationMins": 60,
          "category": "accommodation",
          "estimatedCostInr": 300000,
          "isConfirmed": false,
          "sourceLabel": "[AI ESTIMATE]"
        }
      ]
    }
  ],
  "totalEstimatedCostInr": 500000
}
```

### Response (error)
```json
{
  "error": "trip_not_found",
  "message": "No trip found with the provided ID."
}
```

---

## 2. `packing-checklist`

Generates a personalized packing checklist for a trip.

### Request
```json
{
  "tripId": "uuid"
}
```

### Response (success)
```json
{
  "status": "complete",
  "tripId": "uuid",
  "data_label": "[AI ESTIMATE]",
  "categories": [
    {
      "name": "Clothing",
      "items": [
        { "itemName": "Light cotton shirts", "quantity": 3, "notes": "Goa is hot in October" },
        { "itemName": "Swimwear", "quantity": 2, "notes": null }
      ]
    },
    {
      "name": "Documents",
      "items": [
        { "itemName": "Government ID (Aadhaar / Passport)", "quantity": 1, "notes": null },
        { "itemName": "Train/flight ticket printout or digital copy", "quantity": 1, "notes": null }
      ]
    }
  ]
}
```

---

## 3. `smart-journey`

Returns transport options comparing bus, train, and flight.

### Request
```json
{
  "origin": "Bengaluru",
  "destination": "Goa",
  "travelDate": "2025-10-01",
  "numTravelers": 2,
  "returnDate": "2025-10-05"   // optional, for round-trip
}
```

### Response (success)
```json
{
  "status": "ok",
  "data_label": "[MOCK DATA]",
  "options": [
    {
      "mode": "train",
      "operator": "Indian Railways",
      "departureTime": "2025-10-01T06:00:00+05:30",
      "arrivalTime": "2025-10-01T15:30:00+05:30",
      "durationMins": 570,
      "baseFareInr": 60000,
      "taxesInr": 0,
      "baggageCostInr": 0,
      "lastMileInr": 20000,
      "totalCostInr": 80000,
      "comfortRating": 3,
      "numStops": 0,
      "isRefundable": true,
      "isRecommended": true,
      "recommendationLabel": "Best Value",
      "whyRecommended": "Lowest total cost with comfortable travel time"
    },
    {
      "mode": "flight",
      "operator": "IndiGo",
      "departureTime": "2025-10-01T08:00:00+05:30",
      "arrivalTime": "2025-10-01T09:15:00+05:30",
      "durationMins": 75,
      "baseFareInr": 350000,
      "taxesInr": 45000,
      "baggageCostInr": 80000,
      "lastMileInr": 60000,
      "totalCostInr": 535000,
      "comfortRating": 4,
      "numStops": 0,
      "isRefundable": false,
      "isRecommended": false,
      "recommendationLabel": "Fastest",
      "whyRecommended": null
    }
  ]
}
```

---

## 4. `ticket-search`

Searches for bus, train, or flight tickets.

### Request
```json
{
  "type": "train",
  "origin": "Mumbai",
  "destination": "Pune",
  "date": "2025-10-01",
  "numPassengers": 1,
  "seatClass": "sleeper"        // optional
}
```

### Response (success)
```json
{
  "status": "ok",
  "data_label": "[MOCK DATA]",
  "results": [
    {
      "id": "mock-ticket-001",
      "operator": "Indian Railways",
      "trainNumber": "12127",
      "origin": "Mumbai CST",
      "destination": "Pune Jn",
      "departureAt": "2025-10-01T07:10:00+05:30",
      "arrivalAt": "2025-10-01T10:25:00+05:30",
      "seatClass": "2A",
      "availableSeats": 14,
      "baseFareInr": 85000,
      "totalFareInr": 85000,
      "isRefundable": true,
      "cancellationPolicy": "Full refund if cancelled 24h before departure",
      "bookingUrl": "https://www.irctc.co.in",
      "dataLabel": "[MOCK DATA]"
    }
  ]
}
```

---

## 5. `hidden-cost-calc`

Estimates all hidden and additional costs for a trip.

### Request
```json
{
  "tripId": "uuid",
  "destination": "Goa",
  "numDays": 5,
  "numTravelers": 2,
  "transportMode": "flight",
  "comfortLevel": "standard",
  "includeFood": true,
  "includeLocalTransport": true,
  "includeActivities": true
}
```

### Response (success)
```json
{
  "status": "ok",
  "data_label": "[AI ESTIMATE]",
  "breakdown": {
    "baggageFeesInr": 160000,
    "airportTransferInr": 120000,
    "localTransportInr": 200000,
    "foodDailyInr": 120000,
    "foodTotalInr": 600000,
    "activityFeesInr": 300000,
    "entryFeesInr": 50000,
    "platformConvenienceFeeInr": 45000,
    "taxesInr": 90000,
    "emergencyBufferInr": 200000,
    "miscInr": 100000,
    "totalHiddenCostInr": 1865000
  },
  "notes": "Estimates based on standard travel patterns. Actual costs may vary."
}
```

---

## 6. `safety-info`

Returns safety information for a destination.

### Request
```json
{
  "destination": "Goa",
  "travelDate": "2025-10-01",
  "travelerType": "solo"
}
```

### Response (success)
```json
{
  "status": "ok",
  "data_label": "[MOCK DATA]",
  "disclaimer": "Safety information is provided as general guidance only. TravelAI does not guarantee safety at any location.",
  "destination": "Goa",
  "overallIndicator": "moderate",
  "lastUpdated": "2025-09-15T00:00:00Z",
  "emergencyNumbers": {
    "police": "100",
    "ambulance": "108",
    "fire": "101",
    "womenHelpline": "1091",
    "touristHelpline": "1363"
  },
  "nearbyHospitals": [
    { "name": "Goa Medical College", "phone": "+91-832-2458700", "distanceKm": 8.2 }
  ],
  "safetyNotes": [
    "Beach areas in North Goa can be crowded at night — stay in well-lit areas.",
    "Use registered taxis or app-based cabs for night travel.",
    "Keep valuables secured at the beach."
  ],
  "weatherAlert": null
}
```

---

## 7. `price-alerts` (scheduled / on-demand)

Checks saved price alerts and returns updated prices.

### Request (manual check)
```json
{
  "alertId": "uuid"           // optional — omit to check all active alerts for user
}
```

### Response (success)
```json
{
  "status": "ok",
  "data_label": "[MOCK DATA]",
  "alerts": [
    {
      "alertId": "uuid",
      "origin": "Delhi",
      "destination": "Mumbai",
      "travelDate": "2025-11-01",
      "targetPriceInr": 400000,
      "currentPriceInr": 380000,
      "hasDrop": true,
      "dropAmountInr": 20000,
      "dropPercent": 5,
      "message": "Price dropped ₹200 since you set this alert!"
    }
  ]
}
```

---

## Supabase Realtime Subscriptions (Frontend)

The frontend subscribes to these channels via Supabase Realtime:

| Channel | Table | Events | Purpose |
|---|---|---|---|
| `notifications:user_id` | `notifications` | INSERT | Show in-app bell badge |
| `expenses:group_id` | `expenses` | INSERT/UPDATE/DELETE | Live expense sync |
| `price_alerts:user_id` | `price_alerts` | UPDATE | Update alert status |

---

## Error Codes

| Code | Meaning |
|---|---|
| `trip_not_found` | Trip ID does not exist or user does not own it |
| `invalid_request` | Missing or malformed required fields |
| `ai_unavailable` | AI provider returned an error (mock fallback used) |
| `quota_exceeded` | AI provider rate limit hit |
| `unauthorized` | JWT missing or expired |
| `provider_error` | External travel provider returned an error |
