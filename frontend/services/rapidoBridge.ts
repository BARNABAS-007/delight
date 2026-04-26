/**
 * Rapido Parcel Delivery — API Bridge Placeholder
 * Replace BASE_URL and API_KEY with live Rapido credentials when ready.
 */

const RAPIDO_BASE_URL = 'https://api.rapido.bike/v1'; // TODO: replace with live endpoint
const RAPIDO_API_KEY  = process.env.EXPO_PUBLIC_RAPIDO_KEY || 'YOUR_RAPIDO_API_KEY';

export type RapidoStatus =
  | 'pending'
  | 'assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Coordinates {
  lat: number;
  lng: number;
  address: string;
}

export interface RapidoBookingPayload {
  order_id: string;
  pickup: Coordinates;
  dropoff: Coordinates;
  customer_name: string;
  customer_phone: string;
  package_description?: string;
}

export interface RapidoBookingResponse {
  booking_id: string;
  status: RapidoStatus;
  estimated_minutes: number;
  captain_name?: string;
  captain_phone?: string;
}

// ─── Simulated status progression for development ─────────────────────────────
const MOCK_STATUS_FLOW: RapidoStatus[] = [
  'pending', 'assigned', 'out_for_delivery', 'delivered',
];

let mockBookings: Record<string, { status: RapidoStatus; step: number }> = {};

// ─── Book a Rapido parcel delivery ────────────────────────────────────────────
export async function bookRapidoDelivery(
  payload: RapidoBookingPayload
): Promise<RapidoBookingResponse> {
  try {
    // LIVE: Uncomment when API key is available
    /*
    const res = await fetch(`${RAPIDO_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': RAPIDO_API_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Rapido booking failed');
    return await res.json();
    */

    // MOCK: Simulate a successful booking
    const booking_id = `RAPIDO-${payload.order_id}-${Date.now()}`;
    mockBookings[booking_id] = { status: 'pending', step: 0 };

    return {
      booking_id,
      status: 'pending',
      estimated_minutes: 8,
    };
  } catch (e) {
    console.error('[Rapido] Booking failed:', e);
    throw e;
  }
}

// ─── Poll delivery status ─────────────────────────────────────────────────────
export async function getRapidoStatus(
  booking_id: string
): Promise<{ status: RapidoStatus; estimated_minutes: number; captain_name?: string }> {
  try {
    // LIVE: Uncomment when API key is available
    /*
    const res = await fetch(`${RAPIDO_BASE_URL}/bookings/${booking_id}`, {
      headers: { 'X-Api-Key': RAPIDO_API_KEY },
    });
    return await res.json();
    */

    // MOCK: Advance status on each poll (simulates real-time)
    const booking = mockBookings[booking_id];
    if (!booking) throw new Error('Booking not found');

    // Auto-advance every other poll call
    if (booking.step < MOCK_STATUS_FLOW.length - 1) {
      booking.step += 1;
      booking.status = MOCK_STATUS_FLOW[booking.step];
    }

    const minutesMap: Record<string, number> = {
      pending: 8, assigned: 6, out_for_delivery: 3, delivered: 0,
    };

    const riders = ['Arjun Rao', 'Vikram Singh', 'Manoj Kumar', 'Priya Patel'];
    const captainName = booking.step >= 1 ? riders[Date.now() % riders.length] : undefined;

    return {
      status: booking.status,
      estimated_minutes: minutesMap[booking.status] ?? 0,
      captain_name: captainName,
    };
  } catch (e) {
    console.error('[Rapido] Status fetch failed:', e);
    throw e;
  }
}

export const RAPIDO_STATUS_LABELS: Record<RapidoStatus, string> = {
  pending:           'Finding a captain...',
  assigned:          'Captain Assigned',
  out_for_delivery:  'Out for Delivery',
  delivered:         'Delivered!',
  cancelled:         'Cancelled',
};

export const RAPIDO_STATUS_STEP: Record<RapidoStatus, number> = {
  pending: 0, assigned: 1, out_for_delivery: 2, delivered: 3, cancelled: -1,
};
