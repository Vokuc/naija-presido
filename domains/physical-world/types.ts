export interface PhysVenue {
  id: string;
  zoneId: string | null;
  plotId: string | null;
  buildingId: string | null;
  roomId: string | null;
  name: string;
  type: string;
  capacity: number | null;
  isPublic: boolean;
}

export interface EnterVenuePayload {
  venueId: string;
}

export type LeaveVenuePayload = Record<string, never>;
