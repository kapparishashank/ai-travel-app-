// Supabase Edge Function: ticket-search
// Returns mock ticket results for bus, train, or flight searches.

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface RequestBody {
  type: 'flight' | 'train' | 'bus';
  origin: string;
  destination: string;
  date: string;
  numPassengers: number;
  seatClass?: string;
}

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const body: RequestBody = await req.json().catch(() => ({} as RequestBody));
    const { type, origin, destination, date, numPassengers = 1, seatClass } = body;

    if (!type || !origin || !destination || !date) {
      return errorResponse('invalid_request', 'type, origin, destination, and date are required');
    }

    const results = getMockTickets(type, origin, destination, date, numPassengers, seatClass);

    return jsonResponse({
      status: 'ok',
      data_label: '[MOCK DATA]',
      disclaimer: 'All tickets shown are mock data for demonstration. No real booking is made. Visit the provider website to book.',
      type,
      origin,
      destination,
      date,
      numPassengers,
      results,
    });
  } catch (err) {
    console.error('ticket-search error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});

function getMockTickets(
  type: string,
  origin: string,
  destination: string,
  date: string,
  numPassengers: number,
  seatClass?: string,
) {
  const d = new Date(date);
  const fmt = (h: number, m = 0) => {
    const dt = new Date(d);
    dt.setHours(h, m, 0, 0);
    return dt.toISOString();
  };

  if (type === 'train') {
    return [
      {
        id: 'mock-train-001',
        operator: 'Indian Railways',
        trainNumber: '12127',
        trainName: 'Intercity Express',
        origin,
        destination,
        departureAt: fmt(6, 0),
        arrivalAt: fmt(10, 30),
        durationMins: 270,
        seatClass: seatClass ?? 'SL',
        availableSeats: 28,
        baseFareInr: 45000 * numPassengers,
        totalFareInr: 45000 * numPassengers,
        isRefundable: true,
        cancellationPolicy: 'Full refund if cancelled 48h before. TDR rules apply.',
        bookingUrl: 'https://www.irctc.co.in',
        dataLabel: '[MOCK DATA]',
        tags: ['Recommended'],
      },
      {
        id: 'mock-train-002',
        operator: 'Indian Railways',
        trainNumber: '12921',
        trainName: 'Rajdhani Express',
        origin,
        destination,
        departureAt: fmt(16, 35),
        arrivalAt: fmt(22, 0),
        durationMins: 325,
        seatClass: '2A',
        availableSeats: 4,
        baseFareInr: 180000 * numPassengers,
        totalFareInr: 180000 * numPassengers,
        isRefundable: true,
        cancellationPolicy: 'Full refund if cancelled 48h before.',
        bookingUrl: 'https://www.irctc.co.in',
        dataLabel: '[MOCK DATA]',
        tags: ['Comfortable'],
      },
    ];
  }

  if (type === 'bus') {
    return [
      {
        id: 'mock-bus-001',
        operator: 'RedBus / VRL Travels',
        origin,
        destination,
        departureAt: fmt(21, 30),
        arrivalAt: (() => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); dt.setHours(6, 0); return dt.toISOString(); })(),
        durationMins: 510,
        seatClass: 'AC Sleeper',
        availableSeats: 12,
        baseFareInr: 85000 * numPassengers,
        totalFareInr: 85000 * numPassengers,
        isRefundable: false,
        cancellationPolicy: 'Non-refundable.',
        bookingUrl: 'https://www.redbus.in',
        dataLabel: '[MOCK DATA]',
        tags: ['Cheapest'],
      },
      {
        id: 'mock-bus-002',
        operator: 'SRS Travels',
        origin,
        destination,
        departureAt: fmt(20, 0),
        arrivalAt: (() => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); dt.setHours(5, 30); return dt.toISOString(); })(),
        durationMins: 570,
        seatClass: 'Volvo AC Semi-Sleeper',
        availableSeats: 20,
        baseFareInr: 70000 * numPassengers,
        totalFareInr: 70000 * numPassengers,
        isRefundable: false,
        cancellationPolicy: 'Non-refundable.',
        bookingUrl: 'https://www.redbus.in',
        dataLabel: '[MOCK DATA]',
        tags: [],
      },
    ];
  }

  // flight
  return [
    {
      id: 'mock-flight-001',
      operator: 'IndiGo',
      flightNumber: '6E-204',
      origin,
      destination,
      departureAt: fmt(6, 15),
      arrivalAt: fmt(8, 0),
      durationMins: 105,
      seatClass: 'Economy',
      availableSeats: 15,
      baseFareInr: 320000 * numPassengers,
      taxesInr: 45000 * numPassengers,
      baggageCostInr: 80000 * numPassengers,
      totalFareInr: 445000 * numPassengers,
      isRefundable: false,
      cancellationPolicy: 'Non-refundable base fare.',
      bookingUrl: 'https://www.goindigo.in',
      dataLabel: '[MOCK DATA]',
      tags: ['Cheapest Base Fare'],
    },
    {
      id: 'mock-flight-002',
      operator: 'Air India',
      flightNumber: 'AI-805',
      origin,
      destination,
      departureAt: fmt(10, 0),
      arrivalAt: fmt(11, 45),
      durationMins: 105,
      seatClass: 'Economy',
      availableSeats: 6,
      baseFareInr: 480000 * numPassengers,
      taxesInr: 45000 * numPassengers,
      baggageCostInr: 0,
      totalFareInr: 525000 * numPassengers,
      isRefundable: true,
      cancellationPolicy: 'Refundable. Cancellation fee ₹3,500.',
      bookingUrl: 'https://www.airindia.com',
      dataLabel: '[MOCK DATA]',
      tags: ['Refundable', 'Free Baggage'],
    },
    {
      id: 'mock-flight-003',
      operator: 'Vistara',
      flightNumber: 'UK-801',
      origin,
      destination,
      departureAt: fmt(14, 0),
      arrivalAt: fmt(15, 45),
      durationMins: 105,
      seatClass: 'Economy Flex',
      availableSeats: 3,
      baseFareInr: 550000 * numPassengers,
      taxesInr: 50000 * numPassengers,
      baggageCostInr: 0,
      totalFareInr: 600000 * numPassengers,
      isRefundable: true,
      cancellationPolicy: 'Flexible refund policy.',
      bookingUrl: 'https://www.airvistara.com',
      dataLabel: '[MOCK DATA]',
      tags: ['Best Refund Policy'],
    },
  ];
}
