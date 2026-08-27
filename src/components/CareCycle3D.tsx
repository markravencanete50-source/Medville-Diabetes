import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, Html, Line, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import Container from "./Container";
import { prefersReducedMotion } from "../lib/useReveal";

/*
  The Our Services care cycle: one contained live explainer, not a technical
  backdrop. A single orange signal travels the route the copy describes, from
  the first call through to resupply, and the phase it is passing drives the
  wording beside the canvas.

  Everything a visitor sees lives inside the 3D scene, including the labels.
  An earlier version drew a second route and a second signal over the canvas
  in plain HTML, which read as two things moving at once and sat on top of
  the models. Pinning the labels to their objects removes both problems.

  This component is lazy-loaded by the Services page, so a visitor only
  downloads the three.js chunk once the section approaches.

  The colours below are the one place in the codebase where brand values are
  written as literals rather than as tokens. A three.js material is painted
  on a canvas, not styled by CSS, so it cannot read a custom property. They
  are the same values as --color-ink, --color-accent, --color-brand-soft and
  --color-cta; change them together.
*/
const MEDVILLE = {
  navy: "#00293b",
  cyan: "#18bada",
  cyanSoft: "#d9f4f9",
  orange: "#ff9e1b",
  paper: "#ffffff",
};

type Position = [number, number, number];

/* One list, so the route, the models, the labels and the copy cannot drift
   apart. The order around the loop is the order of the process. */
const PHASES: { label: string; detail: string; node: string; position: Position }[] = [
  {
    label: "Calling",
    detail: "You tell us what you need.",
    node: "Call",
    position: [-2.5, 0.95, 0],
  },
  {
    label: "Verifying",
    detail: "We confirm care and coverage.",
    node: "Verify",
    position: [-0.7, 1.5, 0.15],
  },
  {
    label: "Preparing",
    detail: "We organize the order and supplies.",
    node: "Prepare",
    position: [1.3, 0.95, 0],
  },
  {
    label: "Delivering",
    detail: "Your package moves to your home.",
    node: "Deliver",
    position: [2.35, -0.4, 0.15],
  },
  {
    label: "Received",
    detail: "Your supplies arrive at your door.",
    node: "Receive",
    position: [0.5, -1.4, 0],
  },
  {
    label: "Resupply",
    detail: "The cycle continues when you need more.",
    node: "Resupply",
    position: [-1.8, -0.85, 0.15],
  },
];

const POINTS = PHASES.map((phase) => new THREE.Vector3(...phase.position));

/* One curve drives both the drawn route and the signal that travels it, so
   the dot can never appear to leave its own path. */
const ROUTE = new THREE.CatmullRomCurve3(POINTS, true, "catmullrom", 0.15);
const ROUTE_POINTS = ROUTE.getPoints(180);

/* The label hangs below its object, far enough clear that the two never
   touch while the object drifts on its float. */
const LABEL_DROP = 0.68;

type SceneProps = { reducedMotion: boolean; onPhaseChange: (index: number) => void };

function NodeLabel({
  position,
  text,
  active,
}: {
  position: Position;
  text: string;
  active: boolean;
}) {
  return (
    <Html
      position={[position[0], position[1] - LABEL_DROP, position[2]]}
      center
      zIndexRange={[8, 0]}
      style={{ pointerEvents: "none" }}
    >
      <span className={`journey-node ${active ? "is-active" : ""}`}>{text}</span>
    </Html>
  );
}

function Phone({ position }: { position: Position }) {
  return (
    <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.13}>
      <group position={position} rotation={[0.12, -0.26, 0.16]}>
        <RoundedBox args={[0.46, 0.82, 0.15]} radius={0.085} smoothness={5} castShadow>
          <meshStandardMaterial color={MEDVILLE.navy} roughness={0.36} metalness={0.15} />
        </RoundedBox>
        <RoundedBox args={[0.34, 0.58, 0.03]} radius={0.05} smoothness={5} position={[0, 0.02, 0.085]}>
          <meshStandardMaterial
            color={MEDVILLE.cyan}
            roughness={0.18}
            emissive={MEDVILLE.cyan}
            emissiveIntensity={0.22}
          />
        </RoundedBox>
        <mesh position={[0, -0.32, 0.108]}>
          <circleGeometry args={[0.034, 20]} />
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
        <RoundedBox args={[0.66, 0.52, 0.14]} radius={0.075} smoothness={5} castShadow>
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.3} />
        </RoundedBox>
        <mesh position={[0, 0.02, 0.09]}>
          <circleGeometry args={[0.17, 5]} />
          <meshStandardMaterial
            color={MEDVILLE.cyan}
            roughness={0.22}
            emissive={MEDVILLE.cyan}
            emissiveIntensity={0.18}
          />
        </mesh>
        <mesh position={[0, 0.02, 0.112]} scale={[0.45, 0.32, 1]}>
          <circleGeometry args={[0.17, 5]} />
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
        <RoundedBox args={[0.72, 0.44, 0.44]} radius={0.05} smoothness={5} castShadow>
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.46} />
        </RoundedBox>
        <mesh position={[0, 0.23, 0]} castShadow>
          <boxGeometry args={[0.74, 0.04, 0.46]} />
          <meshStandardMaterial color={MEDVILLE.cyanSoft} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.255, 0]}>
          <boxGeometry args={[0.15, 0.02, 0.47]} />
          <meshStandardMaterial color={MEDVILLE.cyan} roughness={0.25} />
        </mesh>
      </group>
    </Float>
  );
}

function DeliveryTruck({ position }: { position: Position }) {
  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.1}>
      <group position={position} rotation={[0.1, -0.22, 0]}>
        <RoundedBox
          args={[0.66, 0.3, 0.32]}
          radius={0.05}
          smoothness={4}
          position={[-0.09, 0.08, 0]}
          castShadow
        >
          <meshStandardMaterial color={MEDVILLE.cyan} roughness={0.28} metalness={0.1} />
        </RoundedBox>
        <RoundedBox
          args={[0.26, 0.35, 0.32]}
          radius={0.05}
          smoothness={4}
          position={[0.35, 0.04, 0]}
          castShadow
        >
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.36} />
        </RoundedBox>
        <mesh position={[0.35, 0.12, 0.163]}>
          <boxGeometry args={[0.16, 0.14, 0.02]} />
          <meshStandardMaterial color={MEDVILLE.navy} roughness={0.2} />
        </mesh>
        {[-0.26, 0.36].map((x) => (
          <mesh key={x} position={[x, -0.12, 0.17]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.05, 20]} />
            <meshStandardMaterial color={MEDVILLE.navy} roughness={0.5} />
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
        <RoundedBox
          args={[0.58, 0.45, 0.32]}
          radius={0.05}
          smoothness={4}
          position={[0, -0.13, 0]}
          castShadow
        >
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.36} />
        </RoundedBox>
        <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.46, 0.44, 4]} />
          <meshStandardMaterial color={MEDVILLE.navy} roughness={0.42} />
        </mesh>
        <mesh position={[0, -0.14, 0.163]}>
          <boxGeometry args={[0.16, 0.2, 0.02]} />
          <meshStandardMaterial
            color={MEDVILLE.cyan}
            roughness={0.2}
            emissive={MEDVILLE.cyan}
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>
    </Float>
  );
}

function Resupply({ position }: { position: Position }) {
  return (
    <Float speed={1.4} rotationIntensity={0.16} floatIntensity={0.13}>
      <group position={position} rotation={[0.24, 0.1, -0.2]}>
        <mesh castShadow>
          <torusGeometry args={[0.27, 0.095, 18, 36]} />
          <meshStandardMaterial color={MEDVILLE.cyan} roughness={0.22} metalness={0.12} />
        </mesh>
        <mesh position={[0.24, -0.11, 0.05]} castShadow>
          <sphereGeometry args={[0.09, 20, 20]} />
          <meshStandardMaterial color={MEDVILLE.paper} roughness={0.3} />
        </mesh>
      </group>
    </Float>
  );
}

/* The centre of the cycle: a real slab set back behind the route, so the
   scene has a focal point with depth rather than a card laid over it. */
function Core() {
  return (
    <Float speed={0.7} rotationIntensity={0.05} floatIntensity={0.06}>
      <group position={[0, 0, -0.8]} rotation={[0.16, -0.12, -0.04]}>
        <RoundedBox args={[1.5, 1.05, 0.17]} radius={0.15} smoothness={5} castShadow>
          <meshStandardMaterial color={MEDVILLE.navy} roughness={0.26} metalness={0.28} />
        </RoundedBox>
        <mesh position={[0, -0.33, 0.095]}>
          <boxGeometry args={[0.34, 0.035, 0.02]} />
          <meshStandardMaterial
            color={MEDVILLE.orange}
            emissive={MEDVILLE.orange}
            emissiveIntensity={0.35}
          />
        </mesh>
        <Html
          position={[0, 0.08, 0.09]}
          center
          zIndexRange={[6, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="journey-core">
            <span>Medville</span>
            <strong>
              Care
              <br />
              cycle
            </strong>
          </span>
        </Html>
      </group>
    </Float>
  );
}

/* The one moving signal, with a soft halo so it reads at a glance. */
function MovingSignal({ reducedMotion, onPhaseChange }: SceneProps) {
  const signal = useRef<THREE.Group>(null);
  const phase = useRef(-1);

  useFrame((state) => {
    const progress = reducedMotion ? 0.02 : (state.clock.getElapsedTime() * 0.032) % 1;
    const current = signal.current;
    if (!current) return;
    current.position.copy(ROUTE.getPointAt(progress));
    const nextPhase = Math.floor(progress * PHASES.length) % PHASES.length;
    if (nextPhase !== phase.current) {
      phase.current = nextPhase;
      onPhaseChange(nextPhase);
    }
  });

  return (
    <group ref={signal}>
      <mesh castShadow>
        <sphereGeometry args={[0.15, 28, 28]} />
        <meshStandardMaterial
          color={MEDVILLE.orange}
          emissive={MEDVILLE.orange}
          emissiveIntensity={0.45}
          roughness={0.2}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshBasicMaterial color={MEDVILLE.orange} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <pointLight color={MEDVILLE.orange} intensity={2.2} distance={2.4} />
    </group>
  );
}

/*
  Scales the whole scene to the canvas, so the route, the models and their
  labels always sit inside the panel at any width. The scene needs roughly
  6.8 by 4.9 world units including the labels.
*/
function Fit({ children }: { children: React.ReactNode }) {
  const viewport = useThree((state) => state.viewport);
  const scale = Math.min(1, viewport.width / 6.8, viewport.height / 4.9);
  return <group scale={scale}>{children}</group>;
}

function CycleScene({
  reducedMotion,
  onPhaseChange,
  active,
}: SceneProps & { active: number }) {
  return (
    <Fit>
      <group rotation={[-0.08, 0.12, 0]}>
        <ambientLight intensity={0.95} />
        <directionalLight position={[4, 5.5, 4]} intensity={2.1} castShadow />
        <directionalLight position={[-3, 1, 3]} intensity={0.5} color={MEDVILLE.cyanSoft} />
        <pointLight position={[-4.5, 2, 2.5]} color={MEDVILLE.cyan} intensity={1.1} />

        <Line
          points={ROUTE_POINTS}
          color={MEDVILLE.cyan}
          lineWidth={1.7}
          dashed
          dashSize={0.3}
          gapSize={0.22}
          transparent
          opacity={0.72}
        />

        <Core />
        <Phone position={PHASES[0].position} />
        <Verify position={PHASES[1].position} />
        <Package position={PHASES[2].position} />
        <DeliveryTruck position={PHASES[3].position} />
        <HomeMarker position={PHASES[4].position} />
        <Resupply position={PHASES[5].position} />

        {PHASES.map((phase, index) => (
          <NodeLabel
            key={phase.node}
            position={phase.position}
            text={phase.node}
            active={active === index}
          />
        ))}

        <MovingSignal reducedMotion={reducedMotion} onPhaseChange={onPhaseChange} />
        <ContactShadows position={[0, -2.5, 0]} opacity={0.2} scale={7.5} blur={2.6} far={4.5} />
      </group>
    </Fit>
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
            One simple process. <em>Every step coordinated.</em>
          </h2>
          <p className="journey-cycle-lede">
            Get a clear view of the journey, from your initial call through insurance
            coordination and ongoing supply deliveries.
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
            dpr={[1, 2]}
            camera={{ position: [0, 0, 7.2], fov: 35 }}
            gl={{ antialias: true, alpha: true }}
            frameloop={reducedMotion ? "demand" : "always"}
          >
            <CycleScene reducedMotion={reducedMotion} onPhaseChange={setActive} active={active} />
          </Canvas>
        </div>
      </Container>
    </section>
  );
}
