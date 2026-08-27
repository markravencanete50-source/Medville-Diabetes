import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Float, Line, RoundedBox } from "@react-three/drei";
import { House, PackageCheck, PhoneCall, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import * as THREE from "three";
import Container from "./Container";
import { prefersReducedMotion } from "../lib/useReveal";

/*
  The Our Services care cycle: one contained live explainer, not a technical
  backdrop. An orange signal travels the same route the copy describes, from
  the first call through to resupply.

  This component is lazy-loaded by the Services page, so a visitor only
  downloads the three.js chunk once the section approaches.

  The colours below are the one place in the codebase where brand values are
  written as literals rather than as tokens. A three.js material is painted
  on a canvas, not styled by CSS, so it cannot read a custom property. They
  are the same four values as --color-ink, --color-accent, --color-brand-soft
  and --color-cta; change them together.
*/
const MEDVILLE = {
  navy: "#00293b",
  cyan: "#18bada",
  cyanSoft: "#d9f4f9",
  orange: "#ff9e1b",
  paper: "#ffffff",
};

const PHASES = [
  { label: "Calling", detail: "You tell us what you need." },
  { label: "Verifying", detail: "We confirm care and coverage." },
  { label: "Preparing", detail: "We organize the order and supplies." },
  { label: "Delivering", detail: "Your package moves to your home." },
  { label: "Received", detail: "Your supplies arrive at your door." },
  { label: "Resupply", detail: "The cycle continues when you need more." },
] as const;

const NODES = [
  { icon: PhoneCall, label: "Call" },
  { icon: ShieldCheck, label: "Verify" },
  { icon: PackageCheck, label: "Prepare" },
  { icon: Truck, label: "Deliver" },
  { icon: House, label: "Receive" },
  { icon: RefreshCw, label: "Resupply" },
] as const;

const POINTS = [
  new THREE.Vector3(-2.55, 0.95, 0),
  new THREE.Vector3(-0.7, 1.46, 0.12),
  new THREE.Vector3(1.25, 0.9, 0),
  new THREE.Vector3(2.22, -0.36, 0.1),
  new THREE.Vector3(0.45, -1.38, 0),
  new THREE.Vector3(-1.75, -0.82, 0.1),
];

type SceneProps = { reducedMotion: boolean; onPhaseChange: (index: number) => void };
type Position = [number, number, number];

function Phone({ position }: { position: Position }) {
  return (
    <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.13}>
      <group position={position} rotation={[0.12, -0.26, 0.16]}>
        <RoundedBox args={[0.42, 0.76, 0.14]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color={MEDVILLE.navy} roughness={0.42} />
        </RoundedBox>
        <RoundedBox args={[0.31, 0.53, 0.03]} radius={0.045} smoothness={4} position={[0, 0, 0.08]}>
          <meshStandardMaterial color={MEDVILLE.cyan} roughness={0.3} />
        </RoundedBox>
        <mesh position={[0, -0.28, 0.106]}>
          <circleGeometry args={[0.032, 18]} />
          <meshStandardMaterial color={MEDVILLE.paper} />
        </mesh>
      </group>
    </Float>
  );
}

function Verify({ position }: { position: Position }) {
  return (
    <Float speed={1.1} rotationIntensity={0.1} floatIntensity={0.1}>
      <group position={position} rotation={[0.12, 0.25, -0.08]}>
        <RoundedBox args={[0.62, 0.48, 0.13]} radius={0.07} smoothness={4}>
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.34} />
        </RoundedBox>
        <mesh position={[0, 0.02, 0.085]}>
          <circleGeometry args={[0.16, 5]} />
          <meshStandardMaterial color={MEDVILLE.cyan} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0.02, 0.108]} scale={[0.45, 0.32, 1]}>
          <circleGeometry args={[0.16, 5]} />
          <meshStandardMaterial color={MEDVILLE.navy} />
        </mesh>
      </group>
    </Float>
  );
}

function Package({ position }: { position: Position }) {
  return (
    <Float speed={0.9} rotationIntensity={0.08} floatIntensity={0.08}>
      <group position={position} rotation={[0.12, -0.24, 0]}>
        <RoundedBox args={[0.7, 0.42, 0.42]} radius={0.045} smoothness={4}>
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.52} />
        </RoundedBox>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.72, 0.035, 0.44]} />
          <meshStandardMaterial color={MEDVILLE.cyanSoft} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.245, 0]}>
          <boxGeometry args={[0.14, 0.02, 0.45]} />
          <meshStandardMaterial color={MEDVILLE.cyan} />
        </mesh>
      </group>
    </Float>
  );
}

function DeliveryTruck({ position }: { position: Position }) {
  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.1}>
      <group position={position} rotation={[0.1, -0.22, 0]}>
        <RoundedBox args={[0.64, 0.26, 0.3]} radius={0.04} smoothness={3} position={[-0.08, 0.06, 0]}>
          <meshStandardMaterial color={MEDVILLE.cyan} roughness={0.34} />
        </RoundedBox>
        <RoundedBox args={[0.24, 0.33, 0.3]} radius={0.04} smoothness={3} position={[0.33, 0.02, 0]}>
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.42} />
        </RoundedBox>
        {[-0.25, 0.35].map((x) => (
          <mesh key={x} position={[x, -0.13, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.045, 16]} />
            <meshStandardMaterial color={MEDVILLE.navy} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function HomeMarker({ position }: { position: Position }) {
  return (
    <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.08}>
      <group position={position} rotation={[0.08, 0.18, 0]}>
        <RoundedBox args={[0.56, 0.43, 0.3]} radius={0.04} smoothness={3} position={[0, -0.14, 0]}>
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.42} />
        </RoundedBox>
        <mesh position={[0, 0.26, 0]} rotation={[0, 0, Math.PI / 4]}>
          <coneGeometry args={[0.42, 0.54, 4]} />
          <meshStandardMaterial color={MEDVILLE.navy} roughness={0.46} />
        </mesh>
        <mesh position={[0.12, -0.08, 0.16]}>
          <boxGeometry args={[0.14, 0.18, 0.02]} />
          <meshStandardMaterial color={MEDVILLE.cyan} />
        </mesh>
      </group>
    </Float>
  );
}

function Resupply({ position }: { position: Position }) {
  return (
    <Float speed={1.4} rotationIntensity={0.16} floatIntensity={0.13}>
      <group position={position} rotation={[0.2, 0.1, -0.2]}>
        <mesh>
          <torusGeometry args={[0.26, 0.09, 14, 28]} />
          <meshStandardMaterial color={MEDVILLE.cyan} roughness={0.28} />
        </mesh>
        <mesh position={[0.23, -0.11, 0.05]}>
          <sphereGeometry args={[0.085, 18, 18]} />
          <meshStandardMaterial color={MEDVILLE.paper} />
        </mesh>
      </group>
    </Float>
  );
}

/* The travelling signal. It also drives which phase the copy beside the
   canvas is describing, so the words and the scene never disagree. */
function MovingSignal({ reducedMotion, onPhaseChange }: SceneProps) {
  const signal = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(POINTS, true, "catmullrom", 0.15), []);
  const phase = useRef(-1);

  useFrame((state) => {
    const progress = reducedMotion ? 0.02 : (state.clock.getElapsedTime() * 0.032) % 1;
    const position = curve.getPointAt(progress);
    const currentSignal = signal.current;
    if (!currentSignal) return;
    currentSignal.position.copy(position);
    if (!reducedMotion) currentSignal.rotation.y += 0.045;
    const nextPhase = Math.floor(progress * PHASES.length) % PHASES.length;
    if (nextPhase !== phase.current) {
      phase.current = nextPhase;
      onPhaseChange(nextPhase);
    }
  });

  return (
    <mesh ref={signal} castShadow>
      <sphereGeometry args={[0.13, 24, 24]} />
      <meshStandardMaterial
        color={MEDVILLE.orange}
        emissive={MEDVILLE.orange}
        emissiveIntensity={0.28}
        roughness={0.25}
      />
    </mesh>
  );
}

function CycleScene({ reducedMotion, onPhaseChange }: SceneProps) {
  return (
    <group rotation={[-0.08, 0.12, 0]}>
      <ambientLight intensity={1.3} />
      <directionalLight position={[4, 5, 4]} intensity={2.3} castShadow />
      <pointLight position={[-4, 2, 2]} color={MEDVILLE.cyan} intensity={1.25} />
      <Line
        points={[...POINTS, POINTS[0]]}
        color={MEDVILLE.cyan}
        lineWidth={1.25}
        dashed
        dashScale={9}
        dashSize={0.55}
        gapSize={0.35}
        transparent
        opacity={0.72}
      />
      <Phone position={[-2.55, 0.95, 0]} />
      <Verify position={[-0.7, 1.46, 0.12]} />
      <Package position={[1.25, 0.9, 0]} />
      <DeliveryTruck position={[2.22, -0.36, 0.1]} />
      <HomeMarker position={[0.45, -1.38, 0]} />
      <Resupply position={[-1.75, -0.82, 0.1]} />
      <MovingSignal reducedMotion={reducedMotion} onPhaseChange={onPhaseChange} />
      <ContactShadows position={[0, -2.05, 0]} opacity={0.2} scale={6.4} blur={2.8} far={4} />
    </group>
  );
}

export default function CareCycle3D() {
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const panel = useRef<HTMLDivElement>(null);

  /*
    react-three-fiber measures its container to size the renderer, and that
    first measurement does not always arrive for a canvas mounted lazily
    part way down the page. The renderer then keeps the 300 by 150 drawing
    buffer a canvas element defaults to, and the panel sits empty until the
    visitor happens to scroll. The measure hook re-reads on scroll, so a few
    synthetic scroll events over the first half second settle the size
    without waiting for the visitor. They stop as soon as the buffer is real.
  */
  useEffect(() => {
    let tries = 0;
    const settle = window.setInterval(() => {
      const canvas = panel.current?.querySelector("canvas");
      if (!canvas || canvas.width > 300 || tries > 8) {
        window.clearInterval(settle);
        return;
      }
      tries += 1;
      window.dispatchEvent(new Event("scroll"));
    }, 60);
    return () => window.clearInterval(settle);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  return (
    <section className="journey-cycle" aria-labelledby="care-cycle-title">
      <Container wide className="journey-cycle-grid">
        <div className="journey-cycle-copy">
          <p className="journey-eyebrow">The process at a glance</p>
          <h2 id="care-cycle-title">
            One clear route. <em>Always moving forward.</em>
          </h2>
          <p className="journey-cycle-lede">
            Before you read the detail, see the whole path from the first call to
            recurring supplies.
          </p>
          <div className="journey-cycle-active" aria-live="polite">
            <span>{String(active + 1).padStart(2, "0")}</span>
            <div>
              <strong>{PHASES[active].label}</strong>
              <small>{PHASES[active].detail}</small>
            </div>
          </div>
          <ol className="journey-cycle-labels" aria-label="Care cycle milestones">
            {PHASES.map((phase, index) => (
              <li key={phase.label} className={active === index ? "is-active" : ""}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                <span>{phase.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div
          ref={panel}
          className="journey-cycle-canvas"
          aria-label="An animated care cycle: calling, verifying, preparing, delivering, receiving, and resupply."
        >
          <Canvas
            shadows
            dpr={[1, 1.6]}
            camera={{ position: [0, 0, 7.2], fov: 35 }}
            gl={{ antialias: true, alpha: true }}
            frameloop={reducedMotion ? "demand" : "always"}
          >
            <CycleScene reducedMotion={reducedMotion} onPhaseChange={setActive} />
          </Canvas>

          {/* the labelled route, drawn in the DOM so it reads without WebGL */}
          <div className="journey-orbit" aria-hidden="true">
            <div className="journey-orbit-ring">
              <span className="journey-orbit-signal" />
            </div>
            <div className="journey-orbit-core">
              <span>Medville</span>
              <strong>
                Care
                <br />
                cycle
              </strong>
              <i />
            </div>
            {NODES.map((node, index) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.label}
                  className={`journey-orbit-node journey-orbit-node-${index} ${
                    active === index ? "is-active" : ""
                  }`}
                >
                  <span>
                    <Icon size={17} strokeWidth={2.1} />
                  </span>
                  <small>{node.label}</small>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
