'use client';

import { RoadSystem } from './RoadSystem';
import { MamaTarilaBoleJoint } from './MamaTarilaBoleJoint';
import { GarrisonKekePark } from './GarrisonKekePark';
import { GardenCityPlaza } from './GardenCityPlaza';
import { ResidentialCompound } from './ResidentialCompound';
import { StreetProps } from './StreetProps';

export function PortHarcourtNeighbourhood() {
  return (
    <group>
      {/* Road & Ground Foundation */}
      <RoadSystem />

      {/* Venues & Landmarks */}
      <MamaTarilaBoleJoint />
      <GarrisonKekePark />
      <GardenCityPlaza />
      <ResidentialCompound />

      {/* Street Infrastructure & Details */}
      <StreetProps />
    </group>
  );
}
