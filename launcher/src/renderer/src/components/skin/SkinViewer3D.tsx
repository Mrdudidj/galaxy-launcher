import { useEffect, useRef, useState } from "react";
import { IdleAnimation, SkinViewer, type PlayerAnimation } from "skinview3d";
import {
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3
} from "three";
import { HAT_GEOMETRY } from "../../data/hatGeometry";
import { PET_GEOMETRY } from "../../data/petGeometry";
import "./SkinViewer3D.css";

export function SkinViewer3D({
  skinUrl,
  width = 180,
  height = 340,
  zoom = 0.8,
  animation,
  hatId = null,
  petId = null
}: {
  skinUrl: string;
  width?: number;
  height?: number;
  zoom?: number;
  /** Overrides the default idle pose — e.g. an emote preview. Resets cleanly
   *  when swapped since skinview3d's animation setter resets joints itself. */
  animation?: PlayerAnimation | null;
  /** Equipped hat's shop item id, if any — see hatGeometry.ts. */
  hatId?: string | null;
  /** Equipped pet's shop item id, if any — see petGeometry.ts. */
  petId?: string | null;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const hatGroupRef = useRef<Group | null>(null);
  const petGroupRef = useRef<Group | null>(null);
  const petAnimationRef = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    // WebGL isn't guaranteed everywhere (old GPUs, broken drivers, some remote/
    // virtualized displays) — SkinViewer's constructor throws synchronously when
    // it can't get a context, which must not take the rest of the UI down with it.
    try {
      const viewer = new SkinViewer({
        canvas: canvasRef.current,
        width,
        height,
        skin: skinUrl,
        animation: new IdleAnimation(),
        // This is a passive showcase (always auto-rotating) everywhere it's
        // used, not an interactive inspector — OrbitControls' mouse-drag
        // rotation was still enabled underneath with no polar-angle clamp,
        // so a stray drag while moving the mouse toward a button could tip
        // the view vertically on top of the constant left-right auto-spin.
        enableControls: false
      });
      viewer.autoRotate = true;
      viewer.autoRotateSpeed = 0.8;
      viewer.zoom = zoom;

      // The camera looks at the world origin, but the player model's own local
      // origin sits near head height rather than at the model's vertical center —
      // uncorrected, the head is cropped out of frame. Measure the model's actual
      // bounding box and shift it so its center lands on the camera's target,
      // rather than guessing an offset. World matrices are only valid after at
      // least one update, which nothing has triggered yet this early — force it,
      // or the box comes back collapsed at the origin and this is a no-op.
      viewer.playerObject.updateWorldMatrix(true, true);
      const bounds = new Box3().setFromObject(viewer.playerObject);
      const center = bounds.getCenter(new Vector3());
      viewer.playerObject.position.y -= center.y;

      viewerRef.current = viewer;
    } catch (error) {
      console.warn("3D-Skin-Vorschau nicht verfügbar (WebGL fehlgeschlagen):", error);
      setFailed(true);
    }

    return () => {
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
    // Viewer is constructed once against the canvas node; skin updates go
    // through the effect below via loadSkin() instead of remounting the viewer.
  }, []);

  useEffect(() => {
    if (viewerRef.current) void viewerRef.current.loadSkin(skinUrl);
  }, [skinUrl]);

  useEffect(() => {
    if (viewerRef.current) viewerRef.current.animation = animation ?? new IdleAnimation();
  }, [animation]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (hatGroupRef.current) {
      viewer.playerObject.skin.head.remove(hatGroupRef.current);
      hatGroupRef.current = null;
    }

    const boxes = hatId ? HAT_GEOMETRY[hatId] : undefined;
    if (!boxes) return;

    const group = new Group();
    for (const box of boxes) {
      const mesh = new Mesh(new BoxGeometry(...box.size), new MeshBasicMaterial({ color: box.color }));
      mesh.position.set(...box.center);
      group.add(mesh);
    }
    viewer.playerObject.skin.head.add(group);
    hatGroupRef.current = group;
  }, [hatId]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (petAnimationRef.current !== null) {
      cancelAnimationFrame(petAnimationRef.current);
      petAnimationRef.current = null;
    }
    if (petGroupRef.current) {
      viewer.playerObject.remove(petGroupRef.current);
      petGroupRef.current = null;
    }

    const def = petId ? PET_GEOMETRY[petId] : undefined;
    if (!def) return;

    const group = new Group();
    group.position.set(...def.offset);
    group.scale.setScalar(def.scale);

    const planet = new Mesh(new SphereGeometry(2.2, 20, 20), new MeshBasicMaterial({ color: def.planetColor }));
    group.add(planet);

    const ring = new Mesh(new TorusGeometry(3.4, 0.35, 8, 32), new MeshBasicMaterial({ color: def.ringColor }));
    ring.rotation.x = Math.PI / 2.3;
    ring.rotation.z = 0.3;
    group.add(ring);

    // Small sparkle trail — a real particle system reads as "the rare one"
    // far better than a static mesh does.
    const starCount = 24;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const radius = 3.6 + Math.random() * 1.2;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      starPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const starGeometry = new BufferGeometry();
    starGeometry.setAttribute("position", new BufferAttribute(starPositions, 3));
    const stars = new Points(starGeometry, new PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true }));
    group.add(stars);

    viewer.playerObject.add(group);
    petGroupRef.current = group;

    const baseY = def.offset[1];
    const startTime = performance.now();
    const animateBob = (): void => {
      const elapsed = (performance.now() - startTime) / 1000;
      group.position.y = baseY + Math.abs(Math.sin(elapsed * 1.4)) * 0.6;
      ring.rotation.y = elapsed * 0.6;
      petAnimationRef.current = requestAnimationFrame(animateBob);
    };
    petAnimationRef.current = requestAnimationFrame(animateBob);

    return () => {
      if (petAnimationRef.current !== null) cancelAnimationFrame(petAnimationRef.current);
    };
  }, [petId]);

  if (failed) {
    return (
      <div className="skin-viewer-fallback" style={{ width, height }}>
        <img src={skinUrl} alt="Skin" className="skin-viewer-fallback__image" />
      </div>
    );
  }

  return <canvas ref={canvasRef} width={width} height={height} />;
}
