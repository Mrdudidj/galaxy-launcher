import { useEffect, useRef, useState } from "react";
import { IdleAnimation, SkinViewer, type PlayerAnimation } from "skinview3d";
import { Box3, Vector3 } from "three";
import "./SkinViewer3D.css";

export function SkinViewer3D({
  skinUrl,
  width = 180,
  height = 340,
  zoom = 0.8,
  animation
}: {
  skinUrl: string;
  width?: number;
  height?: number;
  zoom?: number;
  /** Overrides the default idle pose — e.g. an emote preview. Resets cleanly
   *  when swapped since skinview3d's animation setter resets joints itself. */
  animation?: PlayerAnimation | null;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
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
        animation: new IdleAnimation()
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

  if (failed) {
    return (
      <div className="skin-viewer-fallback" style={{ width, height }}>
        <img src={skinUrl} alt="Skin" className="skin-viewer-fallback__image" />
      </div>
    );
  }

  return <canvas ref={canvasRef} width={width} height={height} />;
}
