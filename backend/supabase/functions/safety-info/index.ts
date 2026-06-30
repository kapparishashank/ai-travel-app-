// Supabase Edge Function: safety-info
// Returns safety information for a destination. Uses mock data in MVP.

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const { destination, travelerType = 'solo' } = await req.json().catch(() => ({}));

    if (!destination) return errorResponse('invalid_request', 'destination is required');

    const info = getMockSafetyInfo(destination, travelerType);

    return jsonResponse({
      status: 'ok',
      data_label: '[MOCK DATA]',
      disclaimer: 'IMPORTANT: Safety information is provided as general guidance only. TravelAI does not guarantee safety at any location and is not responsible for any incidents. Always exercise personal judgment, follow local laws, and contact local authorities in emergencies.',
      ...info,
    });
  } catch (err) {
    console.error('safety-info error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});

function getMockSafetyInfo(destination: string, travelerType: string) {
  const isSolo = travelerType === 'solo';
  const isWoman = travelerType === 'solo_woman';

  return {
    destination,
    overallIndicator: 'moderate',
    lastUpdated: '2025-09-15T00:00:00Z',
    sourceNote: '[MOCK DATA] Safety data is simulated for MVP. Real data will be sourced from official advisories in a future version.',
    emergencyNumbers: {
      police: '100',
      ambulance: '108',
      fire: '101',
      womenHelpline: '1091',
      childHelpline: '1098',
      touristHelpline: '1363',
      disasterManagement: '108',
    },
    nearbyHospitals: [
      {
        name: `${destination} Government Hospital`,
        phone: '0000-000000',
        distanceKm: 3.5,
        note: '[MOCK DATA] Contact local directory for actual nearest hospital',
      },
    ],
    nearbyPoliceStations: [
      {
        name: `${destination} Central Police Station`,
        phone: '100',
        distanceKm: 1.2,
        note: '[MOCK DATA]',
      },
    ],
    safetyNotes: [
      `Keep a copy of your ID and accommodation address with you at all times in ${destination}.`,
      'Avoid displaying expensive items (phones, cameras, jewellery) in crowded areas.',
      'Use registered taxis or app-based cabs (Ola/Uber) rather than unmarked vehicles.',
      'Stay in well-lit, populated areas after dark.',
      isSolo || isWoman
        ? 'Share your live location with a trusted contact when exploring unfamiliar areas.'
        : 'Keep the group together when moving between locations.',
      isWoman
        ? 'Prefer women-only compartments on trains and buses where available. Trust your instincts.'
        : null,
      'Keep local emergency numbers saved on your phone.',
      'Carry some cash — not all places accept cards.',
    ].filter(Boolean),
    weatherAlert: null,
    travelAdvisory: {
      source: '[MOCK DATA]',
      level: 'Normal precautions',
      detail: 'No current travel advisories for this destination. Always check the official Ministry of External Affairs advisory for international travel.',
    },
    safeTransportTips: [
      'Book trains and buses from official websites (IRCTC, RedBus).',
      'Avoid travelling alone very late at night on isolated routes.',
      'For road trips, inform someone of your route and ETA.',
    ],
    offlineCachedAt: new Date().toISOString(),
  };
}
