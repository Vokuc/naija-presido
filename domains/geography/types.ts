export type GeoLocationType = 'world' | 'country' | 'state' | 'city' | 'district' | 'neighbourhood' | 'zone';

export interface GeoLocation {
  id: string;
  parentId: string | null;
  type: GeoLocationType;
  name: string;
  slug: string;
}

export interface ChangeLocationPayload {
  targetLocationId: string;
}
