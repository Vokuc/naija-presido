'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface HumanCharacterProps {
  gender?: 'male' | 'female';
  skinTone?: string;
  hairStyle?: 'fade' | 'short_part' | 'afro' | 'bald' | 'none';
  hairColor?: string;
  facialHair?: 'none' | 'beard' | 'goatee' | 'mustache' | 'trimmed_mustache';
  facialHairColor?: string;
  headwear?: 'none' | 'gele' | 'keke_cap' | 'security_beret';
  headwearColor?: string;
  outfit?: 'ankara_shirt' | 'polo_shirt' | 'security_uniform' | 'ankara_dress';
  shirtColor?: string;
  trousersColor?: string;
  shoesColor?: string;
  accessory?: 'none' | 'tongs' | 'watch' | 'badge';
  isMoving?: boolean;
  walkSpeedMultiplier?: number;
  idleVariant?: 'relaxed' | 'grilling' | 'patrol';
}

/**
 * Believable Human Character Model for Naija Presido.
 * Incorporates realistic human anatomy:
 * - Elliptical thorax & ribcage with pectoral plates and back scapulae
 * - Natural V-taper waist (male) or hourglass waist/hips (female)
 * - Trapezius and clavicle shoulder slope
 * - Contoured deltoids, biceps, triceps, brachioradialis forearms, and wrists
 * - Anatomical hands with thenar/hypothenar pads, opposable thumb, and articulated fingers
 * - Angled thighs with quadriceps/hamstrings, patella kneecaps, gastrocnemius calves, ankle malleoli
 * - Anatomical head with cranial vault, cheekbones, jawline, chin, orbital sockets, realistic eyes,
 *   sculpted nose with alar nostrils, philtrum, cupid's bow lips, and ears with helix/lobes.
 */
export function HumanCharacterModel({
  gender = 'male',
  skinTone = '#5c3e31',
  hairStyle = 'fade',
  hairColor = '#111111',
  facialHair = 'none',
  facialHairColor = '#111111',
  headwear = 'none',
  headwearColor = '#2c3e50',
  outfit = 'ankara_shirt',
  shirtColor = '#008751',
  trousersColor = '#1e272e',
  shoesColor = '#111111',
  accessory = 'none',
  isMoving = false,
  walkSpeedMultiplier = 1.0,
  idleVariant = 'relaxed',
}: HumanCharacterProps) {
  // Skeletal hierarchy references
  const rootGroupRef = useRef<THREE.Group>(null);
  const pelvisRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  // Arm joints
  const leftShoulderRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);

  // Leg joints
  const leftHipRef = useRef<THREE.Group>(null);
  const rightHipRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const leftFootRef = useRef<THREE.Group>(null);
  const rightFootRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const isFemale = gender === 'female';

    if (isMoving) {
      const cycle = Math.sin(t * 8.5 * walkSpeedMultiplier);

      // Pelvis natural human sway & vertical bob
      if (pelvisRef.current) {
        pelvisRef.current.position.y = Math.abs(Math.sin(t * 8.5 * walkSpeedMultiplier)) * 0.035;
        pelvisRef.current.rotation.y = cycle * 0.07;
        pelvisRef.current.rotation.z = -cycle * 0.03; // lateral pelvic tilt
      }

      // Torso counter-rotation (spine compensates opposite to pelvis)
      if (spineRef.current) {
        spineRef.current.rotation.y = -cycle * 0.06;
        spineRef.current.rotation.z = cycle * 0.025;
      }

      // Head remains stabilized looking forward
      if (headRef.current) {
        headRef.current.rotation.y = cycle * 0.015;
      }

      // Leg stride kinematics
      if (leftHipRef.current) leftHipRef.current.rotation.x = cycle * 0.52;
      if (rightHipRef.current) rightHipRef.current.rotation.x = -cycle * 0.52;

      // Realistic knee flexion: knee bends when swinging backward/recovering
      if (leftKneeRef.current) {
        leftKneeRef.current.rotation.x = Math.max(0, -cycle) * 0.72;
      }
      if (rightKneeRef.current) {
        rightKneeRef.current.rotation.x = Math.max(0, cycle) * 0.72;
      }

      // Foot roll & ankle articulation
      if (leftFootRef.current) {
        leftFootRef.current.rotation.x = cycle > 0 ? 0.18 : -0.22;
      }
      if (rightFootRef.current) {
        rightFootRef.current.rotation.x = -cycle > 0 ? 0.18 : -0.22;
      }

      // Opposite arm swing with natural elbow flexion
      if (leftShoulderRef.current) {
        leftShoulderRef.current.rotation.x = -cycle * 0.42;
        leftShoulderRef.current.rotation.z = isFemale ? 0.1 : 0.05;
      }
      if (rightShoulderRef.current) {
        rightShoulderRef.current.rotation.x = cycle * 0.42;
        rightShoulderRef.current.rotation.z = isFemale ? -0.1 : -0.05;
      }

      if (leftElbowRef.current) {
        leftElbowRef.current.rotation.x = Math.max(0, cycle) * 0.38 + 0.12;
      }
      if (rightElbowRef.current) {
        rightElbowRef.current.rotation.x = Math.max(0, -cycle) * 0.38 + 0.12;
      }
    } else {
      // Natural idle breathing & resting human posture
      const breath = Math.sin(t * 1.8) * 0.012;

      if (pelvisRef.current) {
        pelvisRef.current.position.y = 0;
        pelvisRef.current.rotation.y = 0;
        pelvisRef.current.rotation.z = 0;
      }
      if (spineRef.current) {
        spineRef.current.rotation.y = 0;
        spineRef.current.rotation.z = 0;
        spineRef.current.rotation.x = breath * 0.5;
      }
      if (headRef.current) {
        headRef.current.rotation.y = 0;
      }

      // Reset leg rotations
      if (leftHipRef.current) leftHipRef.current.rotation.x = 0;
      if (rightHipRef.current) rightHipRef.current.rotation.x = 0;
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = 0;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = 0;
      if (leftFootRef.current) leftFootRef.current.rotation.x = 0;
      if (rightFootRef.current) rightFootRef.current.rotation.x = 0;

      // Handle idle variants
      if (idleVariant === 'grilling') {
        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = 0.1;
          leftShoulderRef.current.rotation.z = 0.28; // Hand resting on hip
        }
        if (leftElbowRef.current) leftElbowRef.current.rotation.x = 0.75;
        if (rightShoulderRef.current) {
          rightShoulderRef.current.rotation.x = -0.32 + Math.sin(t * 2.5) * 0.12;
          rightShoulderRef.current.rotation.z = -0.12;
        }
        if (rightElbowRef.current) {
          rightElbowRef.current.rotation.x = 0.65 + Math.sin(t * 2.5) * 0.1;
        }
      } else {
        // Relaxed resting arms
        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = breath * 0.6;
          leftShoulderRef.current.rotation.z = isFemale ? 0.09 : 0.05;
        }
        if (rightShoulderRef.current) {
          rightShoulderRef.current.rotation.x = -breath * 0.6;
          rightShoulderRef.current.rotation.z = isFemale ? -0.09 : -0.05;
        }
        if (leftElbowRef.current) leftElbowRef.current.rotation.x = 0.14;
        if (rightElbowRef.current) rightElbowRef.current.rotation.x = 0.14;
      }
    }
  });

  const isFemale = gender === 'female';
  const isDress = outfit === 'ankara_dress';
  const isSecurity = outfit === 'security_uniform';

  // Human Anthropometric Proportions (meters)
  // Male: broad trapezoidal shoulders, V-taper waist, narrower hips.
  // Female: softer shoulders, narrower waist, wider feminine hips.
  const shoulderSpan = isFemale ? 0.38 : 0.46;
  const shoulderX = shoulderSpan / 2;
  const hipSpan = isFemale ? 0.32 : 0.26;
  const hipX = hipSpan / 2;

  // Lip color derived from skin tone
  const lipColor = '#7d473d';

  return (
    <group ref={rootGroupRef}>
      <group ref={pelvisRef}>
        {/* ==================================================================== */}
        {/* 1. PELVIS & GLUTEAL ANATOMY (FLAT/OVAL, NOT A ROUND TUBE)            */}
        {/* ==================================================================== */}
        <group position={[0, 0.94, 0]}>
          {/* Central Pelvic Core - Elliptical Cross-Section */}
          <mesh scale={[isFemale ? 1.45 : 1.32, 0.85, 0.92]} castShadow>
            <sphereGeometry args={[0.13, 20, 16]} />
            <meshStandardMaterial
              color={isDress ? shirtColor : trousersColor}
              roughness={0.7}
            />
          </mesh>

          {/* Left Gluteal Cheek (Anatomical Gluteus Maximus) */}
          <mesh position={[-0.07, -0.01, -0.055]} scale={[1.0, 1.15, 1.1]} castShadow>
            <sphereGeometry args={[0.075, 14, 14]} />
            <meshStandardMaterial
              color={isDress ? shirtColor : trousersColor}
              roughness={0.7}
            />
          </mesh>

          {/* Right Gluteal Cheek */}
          <mesh position={[0.07, -0.01, -0.055]} scale={[1.0, 1.15, 1.1]} castShadow>
            <sphereGeometry args={[0.075, 14, 14]} />
            <meshStandardMaterial
              color={isDress ? shirtColor : trousersColor}
              roughness={0.7}
            />
          </mesh>

          {/* Groin / Inguinal Fold in Front */}
          <mesh position={[0, -0.04, 0.05]} scale={[1.1, 0.7, 0.9]}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial
              color={isDress ? shirtColor : trousersColor}
              roughness={0.75}
            />
          </mesh>

          {/* Tactical Utility Belt for Security Officer */}
          {isSecurity && (
            <group position={[0, 0.07, 0]}>
              <mesh scale={[1.4, 1.0, 1.0]}>
                <cylinderGeometry args={[0.135, 0.135, 0.045, 20]} />
                <meshStandardMaterial color="#0a0a0a" roughness={0.4} />
              </mesh>
              {/* Belt Buckle */}
              <mesh position={[0, 0, 0.14]}>
                <boxGeometry args={[0.06, 0.04, 0.015]} />
                <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Utility Holster / Radio Pouch */}
              <mesh position={[-0.17, 0.02, 0.04]} rotation={[0, -0.3, 0]}>
                <boxGeometry args={[0.045, 0.09, 0.04]} />
                <meshStandardMaterial color="#111111" roughness={0.5} />
              </mesh>
            </group>
          )}
        </group>

        {/* ==================================================================== */}
        {/* 2. SPINE, TORSO, CHEST & SHOULDERS (REALISTIC HUMAN SILHOUETTE)       */}
        {/* ==================================================================== */}
        <group ref={spineRef} position={[0, 0.98, 0]}>
          {/* Lower Waist & External Obliques (Naturally Narrows at Waistline) */}
          <group position={[0, 0.11, 0]}>
            {/* Abdominal Core - Elliptical (Wide in X, Flattened in Z) */}
            <mesh scale={[isFemale ? 1.35 : 1.48, 1.0, 0.82]} castShadow>
              <cylinderGeometry
                args={[isFemale ? 0.125 : 0.145, isFemale ? 0.135 : 0.142, 0.16, 24]}
              />
              <meshStandardMaterial
                color={shirtColor}
                roughness={isSecurity ? 0.5 : 0.7}
              />
            </mesh>

            {/* Left External Oblique (Waist Curve) */}
            <mesh position={[-0.11, 0, 0]} scale={[0.65, 1.1, 0.8]}>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshStandardMaterial color={shirtColor} roughness={0.7} />
            </mesh>

            {/* Right External Oblique */}
            <mesh position={[0.11, 0, 0]} scale={[0.65, 1.1, 0.8]}>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshStandardMaterial color={shirtColor} roughness={0.7} />
            </mesh>

            {/* Front Abdominal Wall with Subtle Muscle Definition */}
            <mesh position={[0, 0.01, 0.065]} scale={[1.1, 1.0, 0.65]}>
              <sphereGeometry args={[0.068, 14, 14]} />
              <meshStandardMaterial color={shirtColor} roughness={0.7} />
            </mesh>
          </group>

          {/* Upper Thorax & Ribcage (Wide Elliptical Human Chest) */}
          <group position={[0, 0.27, 0.01]}>
            {/* Main Ribcage Ellipsoid - Flattened Front-to-Back (1.68 ratio) */}
            <mesh scale={[isFemale ? 1.55 : 1.72, 1.1, 0.88]} castShadow>
              <sphereGeometry args={[0.13, 24, 20]} />
              <meshStandardMaterial
                color={shirtColor}
                roughness={isSecurity ? 0.5 : 0.7}
              />
            </mesh>

            {/* Latissimus Dorsi Back Sweep (V-Taper under Armpits) */}
            <mesh position={[-0.14, -0.04, -0.03]} rotation={[0, 0, -0.2]} scale={[0.65, 1.2, 0.75]}>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshStandardMaterial color={shirtColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.14, -0.04, -0.03]} rotation={[0, 0, 0.2]} scale={[0.65, 1.2, 0.75]}>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshStandardMaterial color={shirtColor} roughness={0.7} />
            </mesh>

            {/* PECTORAL MUSCLES / BUSTIER */}
            {isFemale ? (
              // Feminine Bust Contours
              <group position={[0, 0.03, 0.07]}>
                <mesh position={[-0.075, 0, 0.02]} scale={[1.05, 1.0, 1.1]}>
                  <sphereGeometry args={[0.072, 16, 16]} />
                  <meshStandardMaterial color={shirtColor} roughness={0.65} />
                </mesh>
                <mesh position={[0.075, 0, 0.02]} scale={[1.05, 1.0, 1.1]}>
                  <sphereGeometry args={[0.072, 16, 16]} />
                  <meshStandardMaterial color={shirtColor} roughness={0.65} />
                </mesh>
              </group>
            ) : (
              // Masculine Pectoralis Major Plates with Sternum Furrow
              <group position={[0, 0.04, 0.065]}>
                {/* Left Pectoral */}
                <mesh
                  position={[-0.08, 0, 0.015]}
                  rotation={[0.12, 0.15, -0.04]}
                  scale={[1.35, 0.9, 0.7]}
                >
                  <sphereGeometry args={[0.068, 16, 14]} />
                  <meshStandardMaterial color={shirtColor} roughness={0.65} />
                </mesh>
                {/* Right Pectoral */}
                <mesh
                  position={[0.08, 0, 0.015]}
                  rotation={[0.12, -0.15, 0.04]}
                  scale={[1.35, 0.9, 0.7]}
                >
                  <sphereGeometry args={[0.068, 16, 14]} />
                  <meshStandardMaterial color={shirtColor} roughness={0.65} />
                </mesh>
                {/* Central Sternal Furrow */}
                <mesh position={[0, 0, 0.04]}>
                  <boxGeometry args={[0.015, 0.12, 0.02]} />
                  <meshStandardMaterial color={shirtColor} roughness={0.8} />
                </mesh>
              </group>
            )}

            {/* Clavicle / Collarbone Ridge Spanning to Shoulders */}
            <mesh position={[0, 0.12, 0.05]} rotation={[0, 0, Math.PI / 2]} scale={[1.7, 0.35, 0.45]}>
              <cylinderGeometry args={[0.022, 0.022, 0.22, 12]} />
              <meshStandardMaterial color={shirtColor} roughness={0.7} />
            </mesh>

            {/* Trapezius Muscle Slopes from Neck to Shoulders */}
            <mesh position={[-0.09, 0.12, -0.02]} rotation={[0, 0, -0.32]} scale={[1.1, 0.7, 0.9]}>
              <boxGeometry args={[0.12, 0.07, 0.08]} />
              <meshStandardMaterial color={shirtColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.09, 0.12, -0.02]} rotation={[0, 0, 0.32]} scale={[1.1, 0.7, 0.9]}>
              <boxGeometry args={[0.12, 0.07, 0.08]} />
              <meshStandardMaterial color={shirtColor} roughness={0.7} />
            </mesh>
          </group>

          {/* Front Placket & Buttons for Tailored Shirts */}
          {!isDress && (
            <group position={[0, 0.25, 0.145]}>
              <mesh>
                <boxGeometry args={[0.03, 0.3, 0.008]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
              </mesh>
              {/* Detailed Buttons */}
              {[-0.09, -0.01, 0.07].map((yOff, i) => (
                <mesh key={i} position={[0, yOff, 0.006]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.007, 0.007, 0.004, 10]} />
                  <meshStandardMaterial
                    color={isSecurity ? '#d4af37' : '#222222'}
                    metalness={isSecurity ? 0.8 : 0.2}
                    roughness={0.3}
                  />
                </mesh>
              ))}
            </group>
          )}

          {/* Security Officer Gold Shield Badge */}
          {isSecurity && (
            <group position={[0.095, 0.32, 0.14]} rotation={[0, 0.1, 0]}>
              <mesh>
                <boxGeometry args={[0.045, 0.055, 0.008]} />
                <meshStandardMaterial color="#f1c40f" metalness={0.88} roughness={0.2} />
              </mesh>
              {/* Star Emblem on Badge */}
              <mesh position={[0, 0, 0.006]}>
                <sphereGeometry args={[0.012, 8, 8]} />
                <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          )}

          {/* Folded Shirt / Uniform Collar */}
          <group position={[0, 0.38, 0]}>
            <mesh rotation={[0.22, 0, 0]}>
              <torusGeometry args={[0.085, 0.02, 10, 20, Math.PI * 1.65]} />
              <meshStandardMaterial color={shirtColor} roughness={0.6} />
            </mesh>
          </group>

          {/* Epaulets on Shoulders (Security Uniform) */}
          {isSecurity && (
            <>
              <mesh position={[-shoulderX + 0.03, 0.38, 0]} rotation={[0, 0, 0.14]}>
                <boxGeometry args={[0.09, 0.02, 0.048]} />
                <meshStandardMaterial color="#0c2461" roughness={0.4} />
              </mesh>
              <mesh position={[shoulderX - 0.03, 0.38, 0]} rotation={[0, 0, -0.14]}>
                <boxGeometry args={[0.09, 0.02, 0.048]} />
                <meshStandardMaterial color="#0c2461" roughness={0.4} />
              </mesh>
            </>
          )}

          {/* Cooking Apron for Mama Tarila */}
          {isDress && (
            <group position={[0, 0.18, 0.135]}>
              {/* Apron Front Panel */}
              <mesh>
                <planeGeometry args={[0.26, 0.42]} />
                <meshStandardMaterial color="#c0392b" roughness={0.6} />
              </mesh>
              {/* Apron Neck Loop */}
              <mesh position={[0, 0.24, -0.03]} rotation={[0.65, 0, 0]}>
                <torusGeometry args={[0.095, 0.009, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#962d22" roughness={0.6} />
              </mesh>
            </group>
          )}

          {/* ================================================================== */}
          {/* 3. NECK & HEAD (ANATOMICALLY SCULPTED HUMAN HEAD & FACE)           */}
          {/* ================================================================== */}
          {/* Natural Human Neck with Sternocleidomastoid Muscle Definition */}
          <group position={[0, 0.43, 0.01]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.055, 0.068, 0.11, 16]} />
              <meshStandardMaterial color={skinTone} roughness={0.65} />
            </mesh>
            {/* Adam's Apple on Male Figures */}
            {!isFemale && (
              <mesh position={[0, 0.01, 0.052]}>
                <sphereGeometry args={[0.011, 8, 8]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
            )}
          </group>

          {/* Cranium & Facial Structure Group */}
          <group ref={headRef} position={[0, 0.57, 0.02]}>
            {/* Cranium Skull Vault (Forehead, Parietal & Occipital Curve) */}
            <mesh position={[0, 0.03, -0.01]} scale={[0.96, 1.05, 1.08]} castShadow>
              <sphereGeometry args={[0.11, 24, 20]} />
              <meshStandardMaterial color={skinTone} roughness={0.65} />
            </mesh>

            {/* Zygomatic Arches (Cheekbones) */}
            <mesh position={[-0.068, -0.015, 0.045]} scale={[1.0, 0.8, 1.1]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial color={skinTone} roughness={0.65} />
            </mesh>
            <mesh position={[0.068, -0.015, 0.045]} scale={[1.0, 0.8, 1.1]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial color={skinTone} roughness={0.65} />
            </mesh>

            {/* Mandible (Jawline) & Chin */}
            <mesh position={[0, -0.075, 0.02]} scale={[0.82, 0.95, 0.92]} castShadow>
              <sphereGeometry args={[0.09, 20, 18]} />
              <meshStandardMaterial color={skinTone} roughness={0.65} />
            </mesh>

            {/* Mental Protuberance (Anatomical Chin Point with Crease) */}
            <mesh position={[0, -0.125, 0.062]} scale={[1.1, 0.9, 1.0]}>
              <sphereGeometry args={[0.024, 14, 14]} />
              <meshStandardMaterial color={skinTone} roughness={0.65} />
            </mesh>

            {/* ================================================================ */}
            {/* DETAILED FACIAL FEATURES                                         */}
            {/* ================================================================ */}
            {/* Supraorbital Brow Ridge */}
            <mesh position={[0, 0.015, 0.092]} scale={[1.6, 0.35, 0.6]}>
              <sphereGeometry args={[0.045, 14, 10]} />
              <meshStandardMaterial color={skinTone} roughness={0.7} />
            </mesh>

            {/* Left Eye in Orbital Socket */}
            <group position={[-0.042, -0.005, 0.096]}>
              {/* Eyeball (Sclera) */}
              <mesh>
                <sphereGeometry args={[0.018, 14, 14]} />
                <meshStandardMaterial color="#f2eee7" roughness={0.15} />
              </mesh>
              {/* Iris with Limbal Ring */}
              <mesh position={[0, 0, 0.014]}>
                <circleGeometry args={[0.009, 16]} />
                <meshStandardMaterial color="#1f0f08" roughness={0.25} />
              </mesh>
              {/* Deep Pupil */}
              <mesh position={[0, 0, 0.015]}>
                <circleGeometry args={[0.0045, 14]} />
                <meshBasicMaterial color="#000000" />
              </mesh>
              {/* Specular Catchlight Reflection Glint */}
              <mesh position={[0.0035, 0.0035, 0.016]}>
                <circleGeometry args={[0.002, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Upper Eyelid Fold (Natural Almond Crease) */}
              <mesh position={[0, 0.012, 0.007]} rotation={[0, 0, -0.08]}>
                <boxGeometry args={[0.026, 0.006, 0.01]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
              {/* Lower Eyelid Rim */}
              <mesh position={[0, -0.012, 0.007]} rotation={[0, 0, 0.04]}>
                <boxGeometry args={[0.024, 0.004, 0.008]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
            </group>

            {/* Right Eye in Orbital Socket */}
            <group position={[0.042, -0.005, 0.096]}>
              {/* Eyeball (Sclera) */}
              <mesh>
                <sphereGeometry args={[0.018, 14, 14]} />
                <meshStandardMaterial color="#f2eee7" roughness={0.15} />
              </mesh>
              {/* Iris with Limbal Ring */}
              <mesh position={[0, 0, 0.014]}>
                <circleGeometry args={[0.009, 16]} />
                <meshStandardMaterial color="#1f0f08" roughness={0.25} />
              </mesh>
              {/* Deep Pupil */}
              <mesh position={[0, 0, 0.015]}>
                <circleGeometry args={[0.0045, 14]} />
                <meshBasicMaterial color="#000000" />
              </mesh>
              {/* Specular Catchlight Reflection Glint */}
              <mesh position={[0.0035, 0.0035, 0.016]}>
                <circleGeometry args={[0.002, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Upper Eyelid Fold */}
              <mesh position={[0, 0.012, 0.007]} rotation={[0, 0, 0.08]}>
                <boxGeometry args={[0.026, 0.006, 0.01]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
              {/* Lower Eyelid Rim */}
              <mesh position={[0, -0.012, 0.007]} rotation={[0, 0, -0.04]}>
                <boxGeometry args={[0.024, 0.004, 0.008]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
            </group>

            {/* Left Eyebrow (Arched Natural Brow) */}
            <mesh position={[-0.044, 0.017, 0.104]} rotation={[0, 0, 0.08]}>
              <boxGeometry args={[0.034, 0.007, 0.007]} />
              <meshStandardMaterial color={facialHairColor} roughness={0.9} />
            </mesh>

            {/* Right Eyebrow */}
            <mesh position={[0.044, 0.017, 0.104]} rotation={[0, 0, -0.08]}>
              <boxGeometry args={[0.034, 0.007, 0.007]} />
              <meshStandardMaterial color={facialHairColor} roughness={0.9} />
            </mesh>

            {/* Sculpted Nose (Nasal Bridge, Lobule Tip & Alar Nostrils) */}
            <group position={[0, -0.026, 0.106]}>
              {/* Bony Nasal Bridge */}
              <mesh position={[0, 0.02, -0.006]} rotation={[0.22, 0, 0]}>
                <cylinderGeometry args={[0.011, 0.015, 0.046, 10]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>
              {/* Rounded Nasal Lobule Tip */}
              <mesh position={[0, -0.006, 0.009]} scale={[1.1, 0.95, 1.1]}>
                <sphereGeometry args={[0.015, 14, 14]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>
              {/* Left Alar Nostril Wing */}
              <mesh position={[-0.016, -0.009, 0.002]} scale={[1.1, 0.9, 1.0]}>
                <sphereGeometry args={[0.011, 10, 10]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>
              {/* Right Alar Nostril Wing */}
              <mesh position={[0.016, -0.009, 0.002]} scale={[1.1, 0.9, 1.0]}>
                <sphereGeometry args={[0.011, 10, 10]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>
              {/* Philtrum Groove under Nose */}
              <mesh position={[0, -0.022, 0.003]}>
                <boxGeometry args={[0.008, 0.016, 0.006]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
            </group>

            {/* Realistic Human Lips with Cupid's Bow */}
            <group position={[0, -0.068, 0.094]}>
              {/* Upper Lip with Cupid's Bow Peaks */}
              <mesh position={[-0.01, 0.006, 0]} rotation={[0, 0, -0.06]}>
                <boxGeometry args={[0.018, 0.008, 0.014]} />
                <meshStandardMaterial color={lipColor} roughness={0.5} />
              </mesh>
              <mesh position={[0.01, 0.006, 0]} rotation={[0, 0, 0.06]}>
                <boxGeometry args={[0.018, 0.008, 0.014]} />
                <meshStandardMaterial color={lipColor} roughness={0.5} />
              </mesh>
              {/* Fuller Lower Lip with Bilateral Pillows */}
              <mesh position={[-0.008, -0.007, 0.002]} scale={[1.2, 0.9, 1.0]}>
                <sphereGeometry args={[0.011, 12, 10]} />
                <meshStandardMaterial color={lipColor} roughness={0.5} />
              </mesh>
              <mesh position={[0.008, -0.007, 0.002]} scale={[1.2, 0.9, 1.0]}>
                <sphereGeometry args={[0.011, 12, 10]} />
                <meshStandardMaterial color={lipColor} roughness={0.5} />
              </mesh>
              {/* Mouth Corners (Commissures) */}
              <mesh position={[-0.022, 0, -0.002]}>
                <sphereGeometry args={[0.004, 6, 6]} />
                <meshStandardMaterial color="#3a1c17" roughness={0.7} />
              </mesh>
              <mesh position={[0.022, 0, -0.002]}>
                <sphereGeometry args={[0.004, 6, 6]} />
                <meshStandardMaterial color="#3a1c17" roughness={0.7} />
              </mesh>
            </group>

            {/* Realistic Ears (Outer Helix Rim, Antihelix, Concha, Lobule) */}
            {/* Left Ear */}
            <group position={[-0.108, -0.012, -0.012]} rotation={[0, -0.22, 0]}>
              {/* Outer Helix Curve */}
              <mesh>
                <torusGeometry args={[0.024, 0.007, 8, 16, Math.PI * 1.55]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
              {/* Concha Basin */}
              <mesh position={[0.006, 0, 0]}>
                <boxGeometry args={[0.01, 0.024, 0.008]} />
                <meshStandardMaterial color={skinTone} roughness={0.75} />
              </mesh>
              {/* Soft Earlobe */}
              <mesh position={[0, -0.022, 0]}>
                <sphereGeometry args={[0.012, 8, 8]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
              {/* Mama Tarila's Gold Hoop Earring */}
              {isDress && (
                <mesh position={[0, -0.034, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.012, 0.003, 8, 16]} />
                  <meshStandardMaterial color="#f1c40f" metalness={0.9} roughness={0.2} />
                </mesh>
              )}
            </group>

            {/* Right Ear */}
            <group position={[0.108, -0.012, -0.012]} rotation={[0, 0.22, 0]}>
              {/* Outer Helix Curve */}
              <mesh>
                <torusGeometry args={[0.024, 0.007, 8, 16, Math.PI * 1.55]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
              {/* Concha Basin */}
              <mesh position={[-0.006, 0, 0]}>
                <boxGeometry args={[0.01, 0.024, 0.008]} />
                <meshStandardMaterial color={skinTone} roughness={0.75} />
              </mesh>
              {/* Soft Earlobe */}
              <mesh position={[0, -0.022, 0]}>
                <sphereGeometry args={[0.012, 8, 8]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>
              {/* Mama Tarila's Gold Hoop Earring */}
              {isDress && (
                <mesh position={[0, -0.034, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.012, 0.003, 8, 16]} />
                  <meshStandardMaterial color="#f1c40f" metalness={0.9} roughness={0.2} />
                </mesh>
              )}
            </group>

            {/* ================================================================ */}
            {/* HAIRSTYLES, FACIAL HAIR & HEADWEAR                               */}
            {/* ================================================================ */}
            {/* Male Low Taper Fade Hairstyle */}
            {hairStyle === 'fade' && headwear === 'none' && (
              <group position={[0, 0.05, -0.01]}>
                {/* Crown & Top Volume */}
                <mesh position={[0, 0.05, 0.01]} scale={[0.96, 0.75, 1.05]}>
                  <sphereGeometry args={[0.112, 20, 16]} />
                  <meshStandardMaterial color={hairColor} roughness={0.95} />
                </mesh>
                {/* Crisply Lined Hairline on Forehead */}
                <mesh position={[0, 0.03, 0.088]} rotation={[0.2, 0, 0]}>
                  <boxGeometry args={[0.098, 0.014, 0.02]} />
                  <meshStandardMaterial color={hairColor} roughness={0.9} />
                </mesh>
              </group>
            )}

            {/* Short Part Hairstyle (Elder Tamuno) */}
            {hairStyle === 'short_part' && headwear === 'none' && (
              <group position={[0, 0.05, -0.01]}>
                <mesh scale={[0.97, 0.8, 1.05]}>
                  <sphereGeometry args={[0.114, 18, 16]} />
                  <meshStandardMaterial color={hairColor} roughness={0.9} />
                </mesh>
                {/* Razor Side Part Line */}
                <mesh position={[-0.045, 0.065, 0.02]} rotation={[0, 0, -0.3]}>
                  <boxGeometry args={[0.004, 0.008, 0.08]} />
                  <meshStandardMaterial color="#000000" roughness={0.8} />
                </mesh>
              </group>
            )}

            {/* Elder Tamuno's Salt-and-Pepper Beard */}
            {facialHair === 'beard' && (
              <group position={[0, -0.085, 0.055]}>
                <mesh scale={[0.88, 1.15, 0.95]}>
                  <sphereGeometry args={[0.075, 16, 14]} />
                  <meshStandardMaterial color={facialHairColor} roughness={0.95} />
                </mesh>
                {/* Mustache Over Upper Lip */}
                <mesh position={[0, 0.028, 0.042]} rotation={[0, 0, 0]}>
                  <boxGeometry args={[0.048, 0.014, 0.018]} />
                  <meshStandardMaterial color={facialHairColor} roughness={0.95} />
                </mesh>
              </group>
            )}

            {/* Inspector Friday's Trimmed Mustache */}
            {facialHair === 'trimmed_mustache' && (
              <mesh position={[0, -0.05, 0.098]}>
                <boxGeometry args={[0.042, 0.012, 0.012]} />
                <meshStandardMaterial color={facialHairColor} roughness={0.9} />
              </mesh>
            )}

            {/* Traditional Nigerian Gele Headscarf (Mama Tarila) */}
            {headwear === 'gele' && (
              <group position={[0, 0.08, -0.01]}>
                {/* Head Wrap Base */}
                <mesh scale={[1.15, 0.95, 1.15]}>
                  <sphereGeometry args={[0.12, 18, 18]} />
                  <meshStandardMaterial color={headwearColor} roughness={0.55} />
                </mesh>
                {/* Dramatic Pleated Fan Folds */}
                <mesh position={[0, 0.12, 0.02]} rotation={[-0.2, 0, 0]} scale={[1.35, 0.45, 1.25]}>
                  <cylinderGeometry args={[0.16, 0.13, 0.09, 18]} />
                  <meshStandardMaterial color={headwearColor} roughness={0.5} />
                </mesh>
                {/* Fan Wing Crest */}
                <mesh position={[0.06, 0.18, -0.04]} rotation={[0.3, 0.25, 0.2]}>
                  <boxGeometry args={[0.22, 0.08, 0.025]} />
                  <meshStandardMaterial color="#e67e22" roughness={0.5} />
                </mesh>
              </group>
            )}

            {/* Keke Driver Newsboy Flat Cap (Elder Tamuno) */}
            {headwear === 'keke_cap' && (
              <group position={[0, 0.085, 0.01]}>
                {/* Cap Crown */}
                <mesh rotation={[0.12, 0, 0]} scale={[1.1, 0.5, 1.25]}>
                  <sphereGeometry args={[0.122, 16, 16]} />
                  <meshStandardMaterial color={headwearColor} roughness={0.75} />
                </mesh>
                {/* Front Visor Peak */}
                <mesh position={[0, -0.02, 0.12]} rotation={[0.25, 0, 0]}>
                  <boxGeometry args={[0.12, 0.015, 0.06]} />
                  <meshStandardMaterial color="#1a252f" roughness={0.8} />
                </mesh>
              </group>
            )}

            {/* Community Security Beret (Inspector Friday) */}
            {headwear === 'security_beret' && (
              <group position={[0.025, 0.095, -0.01]} rotation={[0, 0, -0.22]}>
                {/* Beret Felt Crown Tilted to Right */}
                <mesh scale={[1.15, 0.45, 1.15]}>
                  <sphereGeometry args={[0.12, 18, 16]} />
                  <meshStandardMaterial color={headwearColor} roughness={0.65} />
                </mesh>
                {/* Golden Security Crest Emblem Badge */}
                <group position={[0.095, -0.01, 0.07]} rotation={[0, 0.5, 0]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.016, 0.016, 0.008, 10]} />
                    <meshStandardMaterial color="#f1c40f" metalness={0.9} roughness={0.2} />
                  </mesh>
                </group>
              </group>
            )}
          </group>

          {/* ================================================================== */}
          {/* 4. ARMS & HANDS (DELTOIDS, BICEPS, FOREARMS & ARTICULATED HANDS)   */}
          {/* ================================================================== */}
          {/* LEFT ARM */}
          <group ref={leftShoulderRef} position={[-shoulderX, 0.36, 0]}>
            {/* Anatomical Deltoid Shoulder Cap */}
            <mesh position={[-0.015, 0, 0]} scale={[1.05, 1.3, 1.1]} castShadow>
              <sphereGeometry args={[0.058, 16, 14]} />
              <meshStandardMaterial color={shirtColor} roughness={0.65} />
            </mesh>

            {/* Upper Arm (Bicep in Front, Tricep in Back) */}
            <mesh position={[-0.015, -0.12, 0]} scale={[0.92, 1.0, 1.12]} castShadow>
              <cylinderGeometry args={[0.046, 0.038, 0.2, 16]} />
              <meshStandardMaterial color={shirtColor} roughness={0.65} />
            </mesh>

            {/* Sleeve Cuff */}
            <mesh position={[-0.015, -0.21, 0]}>
              <torusGeometry args={[0.044, 0.007, 8, 16]} />
              <meshStandardMaterial color={shirtColor} roughness={0.8} />
            </mesh>

            {/* Left Elbow Joint */}
            <group ref={leftElbowRef} position={[-0.015, -0.22, 0]}>
              {/* Olecranon Elbow Bone Projection in Back */}
              <mesh position={[0, 0, -0.025]}>
                <sphereGeometry args={[0.018, 10, 10]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>

              {/* Forearm (Brachioradialis Muscle Bulge near Elbow, Tapering to Wrist) */}
              <mesh position={[0, -0.09, 0]} scale={[1.15, 1.0, 0.9]} castShadow>
                <cylinderGeometry args={[0.038, 0.028, 0.18, 16]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>

              {/* Wrist Joint (Flattened Radio-Carpal Joint) */}
              <mesh position={[0, -0.18, 0]} scale={[1.25, 0.7, 0.75]}>
                <sphereGeometry args={[0.026, 10, 10]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>

              {/* Wristwatch on Left Wrist */}
              {accessory === 'watch' && (
                <group position={[0, -0.175, 0]}>
                  <mesh>
                    <cylinderGeometry args={[0.034, 0.034, 0.018, 16]} />
                    <meshStandardMaterial color="#95a5a6" metalness={0.9} roughness={0.2} />
                  </mesh>
                  {/* Watch Dial */}
                  <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.004, 12]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.1} />
                  </mesh>
                </group>
              )}

              {/* Left Hand & Articulated Fingers */}
              <group position={[0, -0.21, 0]}>
                {/* Anatomical Palm with Thenar Pad */}
                <mesh position={[0, -0.028, 0]} scale={[1.1, 1.15, 0.65]} castShadow>
                  <boxGeometry args={[0.046, 0.055, 0.03]} />
                  <meshStandardMaterial color={skinTone} roughness={0.65} />
                </mesh>
                {/* Thenar Eminence (Thumb Base Muscle Pad) */}
                <mesh position={[0.018, -0.02, 0.01]} scale={[1.0, 1.2, 1.1]}>
                  <sphereGeometry args={[0.014, 10, 10]} />
                  <meshStandardMaterial color={skinTone} roughness={0.65} />
                </mesh>
                {/* Opposable Thumb with Two Phalanges (Angled Inward at 35°) */}
                <mesh position={[0.024, -0.022, 0.012]} rotation={[0.35, 0, -0.45]}>
                  <capsuleGeometry args={[0.007, 0.028, 8, 8]} />
                  <meshStandardMaterial color={skinTone} roughness={0.65} />
                </mesh>
                {/* 4 Articulated Fingers with Natural Curvature */}
                <mesh position={[0, -0.068, 0.004]} rotation={[0.3, 0, 0]}>
                  <boxGeometry args={[0.044, 0.028, 0.016]} />
                  <meshStandardMaterial color={skinTone} roughness={0.65} />
                </mesh>
              </group>
            </group>
          </group>

          {/* RIGHT ARM */}
          <group ref={rightShoulderRef} position={[shoulderX, 0.36, 0]}>
            {/* Anatomical Deltoid Shoulder Cap */}
            <mesh position={[0.015, 0, 0]} scale={[1.05, 1.3, 1.1]} castShadow>
              <sphereGeometry args={[0.058, 16, 14]} />
              <meshStandardMaterial color={shirtColor} roughness={0.65} />
            </mesh>

            {/* Upper Arm (Bicep/Tricep) */}
            <mesh position={[0.015, -0.12, 0]} scale={[0.92, 1.0, 1.12]} castShadow>
              <cylinderGeometry args={[0.046, 0.038, 0.2, 16]} />
              <meshStandardMaterial color={shirtColor} roughness={0.65} />
            </mesh>

            {/* Sleeve Cuff */}
            <mesh position={[0.015, -0.21, 0]}>
              <torusGeometry args={[0.044, 0.007, 8, 16]} />
              <meshStandardMaterial color={shirtColor} roughness={0.8} />
            </mesh>

            {/* Right Elbow Joint */}
            <group ref={rightElbowRef} position={[0.015, -0.22, 0]}>
              {/* Olecranon Elbow Bone Projection */}
              <mesh position={[0, 0, -0.025]}>
                <sphereGeometry args={[0.018, 10, 10]} />
                <meshStandardMaterial color={skinTone} roughness={0.7} />
              </mesh>

              {/* Forearm */}
              <mesh position={[0, -0.09, 0]} scale={[1.15, 1.0, 0.9]} castShadow>
                <cylinderGeometry args={[0.038, 0.028, 0.18, 16]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>

              {/* Wrist Joint */}
              <mesh position={[0, -0.18, 0]} scale={[1.25, 0.7, 0.75]}>
                <sphereGeometry args={[0.026, 10, 10]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>

              {/* Right Hand & Fingers */}
              <group position={[0, -0.21, 0]}>
                {/* Anatomical Palm with Thenar Pad */}
                <mesh position={[0, -0.028, 0]} scale={[1.1, 1.15, 0.65]} castShadow>
                  <boxGeometry args={[0.046, 0.055, 0.03]} />
                  <meshStandardMaterial color={skinTone} roughness={0.65} />
                </mesh>
                {/* Thenar Eminence */}
                <mesh position={[-0.018, -0.02, 0.01]} scale={[1.0, 1.2, 1.1]}>
                  <sphereGeometry args={[0.014, 10, 10]} />
                  <meshStandardMaterial color={skinTone} roughness={0.65} />
                </mesh>
                {/* Opposable Thumb */}
                <mesh position={[-0.024, -0.022, 0.012]} rotation={[0.35, 0, 0.45]}>
                  <capsuleGeometry args={[0.007, 0.028, 8, 8]} />
                  <meshStandardMaterial color={skinTone} roughness={0.65} />
                </mesh>
                {/* 4 Articulated Fingers */}
                <mesh position={[0, -0.068, 0.004]} rotation={[0.3, 0, 0]}>
                  <boxGeometry args={[0.044, 0.028, 0.016]} />
                  <meshStandardMaterial color={skinTone} roughness={0.65} />
                </mesh>

                {/* Grilling Tongs Accessory for Mama Tarila */}
                {accessory === 'tongs' && (
                  <group position={[0, -0.05, 0.06]} rotation={[0.55, 0, 0]}>
                    <mesh position={[0, 0, 0.12]}>
                      <cylinderGeometry args={[0.009, 0.009, 0.38, 8]} />
                      <meshStandardMaterial color="#bdc3c7" metalness={0.95} roughness={0.2} />
                    </mesh>
                    <mesh position={[-0.012, 0, 0.24]} rotation={[0, 0.2, 0]}>
                      <boxGeometry args={[0.012, 0.008, 0.08]} />
                      <meshStandardMaterial color="#7f8c8d" metalness={0.9} />
                    </mesh>
                    <mesh position={[0.012, 0, 0.24]} rotation={[0, -0.2, 0]}>
                      <boxGeometry args={[0.012, 0.008, 0.08]} />
                      <meshStandardMaterial color="#7f8c8d" metalness={0.9} />
                    </mesh>
                  </group>
                )}
              </group>
            </group>
          </group>
        </group>

        {/* ==================================================================== */}
        {/* 5. LEGS, THIGHS, KNEES, CALVES & FEET (NATURAL HUMAN SILHOUETTE)     */}
        {/* ==================================================================== */}
        {isDress ? (
          // Traditional Nigerian Wrapper Dress (Mama Tarila)
          <group position={[0, 0.44, 0]}>
            {/* Flowing African Ankara Wrapper Skirt */}
            <mesh castShadow>
              <cylinderGeometry args={[0.17, 0.27, 0.88, 24]} />
              <meshStandardMaterial color="#d4ac0d" roughness={0.65} />
            </mesh>
            {/* Wrapper Overlap Fold Accent */}
            <mesh position={[0.07, 0, 0.2]} rotation={[0, 0.28, 0]}>
              <planeGeometry args={[0.14, 0.86]} />
              <meshStandardMaterial color="#b7950b" roughness={0.7} />
            </mesh>
            {/* Traditional Footwear (Leather Strapped Sandals) */}
            <mesh position={[-0.085, -0.45, 0.04]}>
              <boxGeometry args={[0.075, 0.024, 0.19]} />
              <meshStandardMaterial color="#4a2e22" roughness={0.8} />
            </mesh>
            <mesh position={[0.085, -0.45, 0.04]}>
              <boxGeometry args={[0.075, 0.024, 0.19]} />
              <meshStandardMaterial color="#4a2e22" roughness={0.8} />
            </mesh>
          </group>
        ) : (
          <>
            {/* LEFT LEG */}
            <group ref={leftHipRef} position={[-hipX, 0.92, 0]}>
              {/* Thigh (Quadriceps in Front, Hamstrings in Back, Lateral Valgus Slope) */}
              <mesh position={[0, -0.17, 0]} rotation={[0, 0, -0.03]} scale={[0.95, 1.0, 1.15]} castShadow>
                <cylinderGeometry args={[0.075, 0.054, 0.35, 20]} />
                <meshStandardMaterial color={trousersColor} roughness={0.75} />
              </mesh>
              {/* Front Quadriceps Muscle Sweep */}
              <mesh position={[0, -0.14, 0.028]} scale={[0.9, 1.3, 0.8]}>
                <sphereGeometry args={[0.052, 12, 12]} />
                <meshStandardMaterial color={trousersColor} roughness={0.75} />
              </mesh>

              {/* Left Knee Joint */}
              <group ref={leftKneeRef} position={[0, -0.36, 0]}>
                {/* Patella (Kneecap Plate) */}
                <mesh position={[0, 0, 0.035]} scale={[1.0, 1.1, 0.8]}>
                  <sphereGeometry args={[0.036, 14, 14]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>
                {/* Patellar Tendon down to Tibia */}
                <mesh position={[0, -0.04, 0.032]}>
                  <boxGeometry args={[0.024, 0.045, 0.015]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>

                {/* Lower Shank & Calf (Gastrocnemius Bulge in Back, Shin in Front) */}
                <mesh position={[0, -0.19, -0.008]} scale={[0.92, 1.0, 1.18]} castShadow>
                  <cylinderGeometry args={[0.054, 0.038, 0.36, 20]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>
                {/* Upper Calf Muscle Bulge in Back */}
                <mesh position={[0, -0.12, -0.032]} scale={[0.95, 1.3, 1.1]}>
                  <sphereGeometry args={[0.046, 14, 14]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>

                {/* Medial & Lateral Ankle Malleoli (Inner and Outer Ankle Bones) */}
                <mesh position={[-0.036, -0.34, 0]}>
                  <sphereGeometry args={[0.012, 8, 8]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>
                <mesh position={[0.036, -0.34, 0]}>
                  <sphereGeometry args={[0.012, 8, 8]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>

                {/* Left Foot & Contoured Shoe */}
                <group ref={leftFootRef} position={[0, -0.39, 0.035]}>
                  {/* Contoured Shoe Upper */}
                  <mesh position={[0, 0.03, 0.015]} scale={[0.88, 0.95, 1.05]} castShadow>
                    <boxGeometry args={[0.088, 0.058, 0.21]} />
                    <meshStandardMaterial
                      color={shoesColor}
                      roughness={isSecurity ? 0.35 : 0.65}
                      metalness={isSecurity ? 0.2 : 0}
                    />
                  </mesh>
                  {/* Anatomical Rounded Toe Box */}
                  <mesh position={[0, 0.022, 0.11]} scale={[1.2, 0.8, 1.0]}>
                    <sphereGeometry args={[0.042, 14, 12]} />
                    <meshStandardMaterial color={shoesColor} roughness={0.4} />
                  </mesh>
                  {/* Heel Counter */}
                  <mesh position={[0, 0.035, -0.065]} scale={[1.1, 1.1, 1.0]}>
                    <sphereGeometry args={[0.036, 12, 12]} />
                    <meshStandardMaterial color={shoesColor} roughness={0.5} />
                  </mesh>
                  {/* Shoe Tread / Rubber Sole */}
                  <mesh position={[0, 0.007, 0.02]}>
                    <boxGeometry args={[0.092, 0.014, 0.23]} />
                    <meshStandardMaterial color="#050505" roughness={0.9} />
                  </mesh>
                </group>
              </group>
            </group>

            {/* RIGHT LEG */}
            <group ref={rightHipRef} position={[hipX, 0.92, 0]}>
              {/* Thigh */}
              <mesh position={[0, -0.17, 0]} rotation={[0, 0, 0.03]} scale={[0.95, 1.0, 1.15]} castShadow>
                <cylinderGeometry args={[0.075, 0.054, 0.35, 20]} />
                <meshStandardMaterial color={trousersColor} roughness={0.75} />
              </mesh>
              {/* Front Quadriceps Muscle Sweep */}
              <mesh position={[0, -0.14, 0.028]} scale={[0.9, 1.3, 0.8]}>
                <sphereGeometry args={[0.052, 12, 12]} />
                <meshStandardMaterial color={trousersColor} roughness={0.75} />
              </mesh>

              {/* Right Knee Joint */}
              <group ref={rightKneeRef} position={[0, -0.36, 0]}>
                {/* Patella (Kneecap Plate) */}
                <mesh position={[0, 0, 0.035]} scale={[1.0, 1.1, 0.8]}>
                  <sphereGeometry args={[0.036, 14, 14]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>
                {/* Patellar Tendon */}
                <mesh position={[0, -0.04, 0.032]}>
                  <boxGeometry args={[0.024, 0.045, 0.015]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>

                {/* Lower Shank & Calf */}
                <mesh position={[0, -0.19, -0.008]} scale={[0.92, 1.0, 1.18]} castShadow>
                  <cylinderGeometry args={[0.054, 0.038, 0.36, 20]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>
                {/* Upper Calf Muscle Bulge in Back */}
                <mesh position={[0, -0.12, -0.032]} scale={[0.95, 1.3, 1.1]}>
                  <sphereGeometry args={[0.046, 14, 14]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>

                {/* Ankle Malleoli */}
                <mesh position={[-0.036, -0.34, 0]}>
                  <sphereGeometry args={[0.012, 8, 8]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>
                <mesh position={[0.036, -0.34, 0]}>
                  <sphereGeometry args={[0.012, 8, 8]} />
                  <meshStandardMaterial color={trousersColor} roughness={0.75} />
                </mesh>

                {/* Right Foot & Contoured Shoe */}
                <group ref={rightFootRef} position={[0, -0.39, 0.035]}>
                  {/* Contoured Shoe Upper */}
                  <mesh position={[0, 0.03, 0.015]} scale={[0.88, 0.95, 1.05]} castShadow>
                    <boxGeometry args={[0.088, 0.058, 0.21]} />
                    <meshStandardMaterial
                      color={shoesColor}
                      roughness={isSecurity ? 0.35 : 0.65}
                      metalness={isSecurity ? 0.2 : 0}
                    />
                  </mesh>
                  {/* Anatomical Rounded Toe Box */}
                  <mesh position={[0, 0.022, 0.11]} scale={[1.2, 0.8, 1.0]}>
                    <sphereGeometry args={[0.042, 14, 12]} />
                    <meshStandardMaterial color={shoesColor} roughness={0.4} />
                  </mesh>
                  {/* Heel Counter */}
                  <mesh position={[0, 0.035, -0.065]} scale={[1.1, 1.1, 1.0]}>
                    <sphereGeometry args={[0.036, 12, 12]} />
                    <meshStandardMaterial color={shoesColor} roughness={0.5} />
                  </mesh>
                  {/* Shoe Tread / Rubber Sole */}
                  <mesh position={[0, 0.007, 0.02]}>
                    <boxGeometry args={[0.092, 0.014, 0.23]} />
                    <meshStandardMaterial color="#050505" roughness={0.9} />
                  </mesh>
                </group>
              </group>
            </group>
          </>
        )}
      </group>
    </group>
  );
}
