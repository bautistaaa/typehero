'use client';
import { Billboard, Edges, Image, PerspectiveCamera, Text, useGLTF } from '@react-three/drei';
import {
  Canvas,
  extend,
  useFrame,
  type GroupProps,
  type MeshProps,
  type ThreeElement,
} from '@react-three/fiber';
import { useScroll, useSpring } from 'framer-motion';
import { motion } from 'framer-motion-3d';
import { geometry } from 'maath';
import type { RoundedPlaneGeometry } from 'maath/dist/declarations/src/geometry';
import { useTheme } from 'next-themes';
import { useRef } from 'react';
import {
  Color,
  DoubleSide,
  LinearToneMapping,
  type Mesh,
  type PerspectiveCamera as PerspectiveCameraType,
} from 'three';

// TODO: Test this page.
declare module '@react-three/fiber' {
  interface ThreeElements {
    roundedPlaneGeometry: ThreeElement<typeof RoundedPlaneGeometry>;
  }
}
extend({ RoundedPlaneGeometry: geometry.RoundedPlaneGeometry });
interface DataProps {
  data: { name: string; image: string | null; score: number | string }[];
  isDayStage: boolean;
}
export function Stage(props: DataProps) {
  return (
    <Canvas
      gl={{
        toneMapping: LinearToneMapping,
      }}
    >
      {/* <Perf position="top-right" /> */}
      <Experience data={props.data} isDayStage={props.isDayStage} />
    </Canvas>
  );
}
const colors = {
  red: new Color(0xff3d3d),
  green: new Color(0x2d9d2d),
  gold: new Color(0xffd700),
  offWhite: new Color(0xeaeaea),
};
function Experience(props: DataProps) {
  const cameraRef = useRef<PerspectiveCameraType>(null);
  // TODO: Removed smooth param: deprecated
  const { scrollY } = useScroll();
  const scrollYProgress = useSpring(scrollY, {
    damping: 20,
    stiffness: 100,
  });
  useFrame(() => {
    if (cameraRef.current === null) return;

    const progress = Math.min(scrollYProgress.get() / 330, 1);
    cameraRef.current.position.y = 4 + progress * -10;
    cameraRef.current.lookAt(0, 2, 0);
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4.2]} ref={cameraRef} zoom={1} />
      {/* <OrbitControls /> */}
      <motion.group
        scale={1.35}
        initial="initial"
        animate="animate"
        transition={{
          staggerChildren: 0.5,
        }}
      >
        <Platform
          color={colors.red}
          x={0}
          height={1.8 + 2.5}
          heightOffset={2.5}
          userInfo={{
            username: props.data[0]?.name ?? '',
            points: props.data[0]?.score ?? '',
            image: props.data[0]?.image ?? null,
          }}
          z={0.001}
          isDayStage={props.isDayStage}
          decorations={
            <group position-y={1.8 + 2.5 - 0.5}>
              <Gift
                position-z={0.4}
                position-x={-0.42}
                rotation-y={Math.PI * 0.24}
                rotation-z={-Math.PI * 0.05}
              />
              <Gift position-z={0.4} position-x={-0.3} rotation-y={Math.PI * 0.1} />
              <Gift position-z={0.3} position-x={-0.39} rotation-y={Math.PI * 0.1} />
              <CandyCane
                position-z={-0.2}
                position-x={-0.45}
                position-y={-0.1}
                rotation-z={-Math.PI * 0.1}
                rotation-y={-Math.PI * 0.65}
                scale={4}
              />
              <Tree position-z={-0.4} position-x={-0.47} />
              <Tree position-z={0.4} position-x={0.4} />
            </group>
          }
        />
        <Platform
          color={colors.green}
          x={-1.001}
          height={1.5 + 2.5}
          heightOffset={2.5}
          userInfo={{
            username: props.data[1]?.name ?? '',
            points: props.data[1]?.score ?? '',
            image: props.data[1]?.image ?? null,
          }}
          isDayStage={props.isDayStage}
          decorations={
            <group position-y={1.5 + 2.5 - 0.5}>
              <Gift
                position-z={0.4}
                position-x={0.42}
                rotation-y={Math.PI * 0.24}
                rotation-z={Math.PI * 0.1}
              />
              <Gift position-z={0.4} position-x={0.3} rotation-y={Math.PI * 0.1} />
              <Tree position-z={-0.2} position-x={0.3} />
              <Snowman position-z={0.49} position-x={-0.4} rotation-y={-Math.PI * 0.3} />
            </group>
          }
        />
        <Platform
          color={colors.green}
          x={1.001}
          height={1.2 + 2.5}
          heightOffset={2.5}
          userInfo={{
            username: props.data[2]?.name ?? '',
            points: props.data[2]?.score ?? '',
            image: props.data[2]?.image ?? null,
          }}
          isDayStage={props.isDayStage}
          decorations={
            <group position-y={1.18 + 2.5 - 0.5}>
              <Gift
                position-z={0.4}
                position-x={0.25}
                rotation-y={Math.PI * 0.15}
                rotation-z={-Math.PI * 0.04}
              />
              <CandyCane
                scale={6}
                position-z={0.46}
                position-x={-0.4}
                position-y={-0.1}
                rotation-z={-Math.PI * 0.1}
                rotation-y={-Math.PI * 0.35}
              />
              <Tree position-z={-0.4} position-x={-0.2} />
              <Tree position-z={0.4} position-x={0.4} />
            </group>
          }
        />
      </motion.group>
    </>
  );
}

function Platform(props: {
  x: number;
  z?: number;
  height: number;
  heightOffset: number;
  userInfo: { username: string; points: number | string; image: string | null };
  isDayStage: boolean;
  color: Color | string;
  decorations: React.JSX.Element;
}) {
  const { resolvedTheme } = useTheme();
  return (
    <motion.group
      position-z={props.z ?? 0}
      position-x={props.x}
      variants={{
        initial: {
          y: -props.height - props.heightOffset,
        },
        animate: {
          y: 0.4 - props.heightOffset,
          transition: {
            duration: 1,
          },
        },
      }}
    >
      <Billboard
        lockZ
        position-y={props.height}
        position-z={0.35}
        scale={0.7}
        onClick={() => {
          window.open(`https://typehero.dev/@${props.userInfo.username}`, '_blank')?.focus();
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <motion.group
          whileHover={{
            scale: 1.1,
          }}
        >
          <ImageWithFallback image={props.userInfo.image} name={props.userInfo.username} />
          <Text
            fontSize={0.14}
            position-y={0.55}
            maxWidth={1}
            font="/roboto-mono-v23-latin-regular.woff"
            anchorY="bottom"
            textAlign="center"
            color={resolvedTheme === 'dark' ? 'white' : 'black'}
          >
            {props.userInfo.username}
          </Text>
        </motion.group>
      </Billboard>
      <mesh position-y={(props.height - 1) / 2}>
        <boxGeometry args={[1, props.height, 1]} />
        <meshBasicMaterial color={resolvedTheme === 'dark' ? 'black' : 'white'} />
        <Edges
          linewidth={2}
          color={resolvedTheme === 'dark' ? props.color : props.color}
          scale={1.001}
        />
      </mesh>
      <group>
        {props.decorations}

        <SnowCurves position-y={props.height - 0.5} />
        {/* front snow plane */}
        <mesh position-y={props.height - 0.49} position-z={0.51}>
          <planeGeometry args={[1, 0.02]} />
          <meshBasicMaterial
            color={resolvedTheme === 'dark' ? colors.offWhite : new Color(0xeeeded)}
          />
        </mesh>
        {/* top plane snow */}
        <mesh position-y={props.height - 0.49} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.01, 1.01]} />
          <meshBasicMaterial color={resolvedTheme === 'dark' ? 'white' : new Color(0xe3e3e3)} />
        </mesh>
      </group>
      <group position-z={0.51}>
        <Text
          fontSize={0.14}
          font="/roboto-mono-v23-latin-regular.woff"
          textAlign="center"
          anchorY="top"
          position-y={props.height - 0.61}
          maxWidth={0.9}
          overflowWrap="break-word"
          color={resolvedTheme === 'dark' ? 'white' : 'black'}
        >
          {props.userInfo.points}
        </Text>
        {props.isDayStage ? null : (
          <Text
            anchorY="top"
            position-y={props.height - 0.76}
            fontSize={0.1}
            font="/roboto-mono-v23-latin-regular.woff"
            color={resolvedTheme === 'dark' ? 'white' : 'black'}
          >
            points
          </Text>
        )}
      </group>
    </motion.group>
  );
}

function ImageWithFallback(props: { image: string | null; name: string }) {
  const { resolvedTheme } = useTheme();
  if (props.image === null) {
    return (
      <mesh>
        <roundedPlaneGeometry args={[1, 1, 0.1]} />
        <Text position-z={0.01} fontSize={0.5} color="white">
          {props.name.slice(0, 1)}
        </Text>
        <meshBasicMaterial
          color={
            resolvedTheme === 'dark'
              ? new Color('hsl(132, 90%, 10%)')
              : new Color('hsl(132, 80%, 40%)')
          }
        />
      </mesh>
    );
  }
  return (
    <Image url={props.image}>
      <roundedPlaneGeometry args={[1, 1, 0.1]} />
    </Image>
  );
}

type TreeGLTFResult = ReturnType<typeof useGLTF> & {
  nodes: {
    Tree: Mesh;
    Balls: Mesh;
    Star: Mesh;
  };
};

function Tree(props: GroupProps) {
  const { nodes } = useGLTF('/leaderboard-stage/Chrismas_Tree_Stylized.glb') as TreeGLTFResult;
  return (
    <group dispose={null} scale={0.2} {...props}>
      <mesh geometry={nodes.Tree.geometry}>
        <meshBasicMaterial color={colors.green} />
        <Edges color="#000000" scale={1.001} linewidth={0.5} />
      </mesh>
      <mesh geometry={nodes.Balls.geometry}>
        <meshBasicMaterial color={colors.gold} />
      </mesh>
      <mesh geometry={nodes.Star.geometry}>
        <meshBasicMaterial color={colors.gold} />
      </mesh>
    </group>
  );
}
function SnowCurves(props: GroupProps) {
  const radiuses = fiveRandomNumbers();
  return (
    <group {...props} position-z={0.51}>
      <HalfCircle position-x={-0.4} radius={radiuses[0] ?? 0.1} />
      <HalfCircle position-x={-0.2} radius={radiuses[1] ?? 0.1} />
      <HalfCircle position-x={0} radius={radiuses[2] ?? 0.1} />
      <HalfCircle position-x={0.2} radius={radiuses[3] ?? 0.1} />
      <HalfCircle position-x={0.4} radius={radiuses[4] ?? 0.1} />
    </group>
  );
}

function HalfCircle(props: MeshProps & { radius: number }) {
  return (
    <mesh {...props}>
      <circleGeometry args={[props.radius, 16, Math.PI, Math.PI]} />
      <meshBasicMaterial color={colors.offWhite} />
    </mesh>
  );
}

function fiveRandomNumbers() {
  const result = [0.1];
  let remainingSum = 0.3;

  for (let i = 0; i < 2; i++) {
    const maxPossible = Math.min(0.13, remainingSum - 0.05 * (2 - i));
    const minPossible = Math.max(0.08, remainingSum - 0.13 * (2 - i));

    const num = Math.random() * (maxPossible - minPossible) + minPossible;
    const rounded = Number(num.toFixed(3));
    result.push(rounded);
    remainingSum -= rounded;
  }

  result.push(Number(remainingSum.toFixed(3)));
  result.push(0.1);
  return result;
}

useGLTF.preload('/leaderboard-stage/Chrismas_Tree_Stylized.glb');

type CandyCaneGLTFResult = ReturnType<typeof useGLTF> & {
  nodes: {
    Vert001: Mesh;
  };
};

function CandyCane({ scale, ...props }: GroupProps & { scale?: number }) {
  const { nodes } = useGLTF('/leaderboard-stage/cane.glb') as CandyCaneGLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Vert001.geometry} scale={scale ?? 5}>
        <meshBasicMaterial color={colors.red} />
      </mesh>
    </group>
  );
}

useGLTF.preload('/leaderboard-stage/cane.glb');

type GiftGLTFResult = ReturnType<typeof useGLTF> & {
  nodes: {
    Gift: Mesh;
    GiftRibbon: Mesh;
    Sphere001: Mesh;
    BézierCircle: Mesh;
    BézierCircle001: Mesh;
    BézierCircle002: Mesh;
    BézierCircle003: Mesh;
  };
};

export function Gift(props: React.JSX.IntrinsicElements['group']) {
  const { nodes } = useGLTF('/leaderboard-stage/gift.glb') as GiftGLTFResult;
  return (
    <group {...props} dispose={null} scale={2}>
      <mesh geometry={nodes.Gift.geometry}>
        <meshBasicMaterial color={colors.red} />
        <Edges color="#000000" scale={1.001} linewidth={0.5} />
      </mesh>
      <mesh geometry={nodes.GiftRibbon.geometry}>
        <meshBasicMaterial color={colors.green} />
      </mesh>
      <mesh geometry={nodes.Sphere001.geometry}>
        <meshBasicMaterial color={colors.gold} />
        <mesh geometry={nodes.BézierCircle.geometry} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={colors.gold} />
        </mesh>
        <mesh geometry={nodes.BézierCircle001.geometry} rotation={[Math.PI / 2, 0, -Math.PI / 2]}>
          <meshBasicMaterial color={colors.gold} />
        </mesh>
        <mesh geometry={nodes.BézierCircle002.geometry} rotation={[Math.PI / 2, 0, Math.PI]}>
          <meshBasicMaterial color={colors.gold} />
        </mesh>
        <mesh geometry={nodes.BézierCircle003.geometry} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <meshBasicMaterial color={colors.gold} />
        </mesh>
      </mesh>
    </group>
  );
}

useGLTF.preload('/leaderboard-stage/gift.glb');

type SnowmanGLTFResult = ReturnType<typeof useGLTF> & {
  nodes: {
    scarf: Mesh;
    hat: Mesh;
    eyes: Mesh;
    teeth: Mesh;
    belly: Mesh;
    hand: Mesh;
    face: Mesh;
    nose: Mesh;
  };
};

function Snowman(props: React.JSX.IntrinsicElements['group']) {
  const { nodes } = useGLTF('/leaderboard-stage/snowman.glb') as SnowmanGLTFResult;
  return (
    <group {...props} dispose={null} scale={0.1}>
      <mesh geometry={nodes.scarf.geometry} rotation={[-0.017, 0, 0.009]}>
        <meshBasicMaterial color={colors.red} />
      </mesh>

      <mesh geometry={nodes.hat.geometry} rotation={[0, 0.681, 0]}>
        <meshBasicMaterial color={colors.green} side={DoubleSide} />
      </mesh>

      <mesh geometry={nodes.eyes.geometry} rotation={[0, 0.681, 0]}>
        <meshBasicMaterial color="black" />
      </mesh>

      <mesh geometry={nodes.teeth.geometry} rotation={[0, 0.681, 0]}>
        <meshBasicMaterial color="black" />
      </mesh>

      <mesh geometry={nodes.belly.geometry} rotation={[0, 0.681, 0]}>
        <meshBasicMaterial color={new Color(0xfbfbfb)} />
      </mesh>

      <mesh geometry={nodes.hand.geometry} rotation={[0, 0.681, 0]}>
        <meshBasicMaterial color={colors.gold} />
      </mesh>

      <mesh geometry={nodes.face.geometry} rotation={[0, 0.681, 0]}>
        <meshBasicMaterial color={new Color(0xfbfbfb)} />
      </mesh>

      <mesh geometry={nodes.nose.geometry} rotation={[0, 0.681, 0]}>
        <meshBasicMaterial color={colors.gold} />
      </mesh>
    </group>
  );
}

useGLTF.preload('/leaderboard-stage/snowman.glb');
