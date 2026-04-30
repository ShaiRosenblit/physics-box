import { Assets, type Texture } from "pixi.js";
import ballWoodDiffuseUrl from "./assets/ball-wood-diffuse.png";
import woodBoxNineUrl from "./assets/wood-box-nineslice.png";

export interface LoadedRenderTextures {
  readonly woodBox: Texture;
  readonly ballWood: Texture;
}

/** Loads PNG sprites for raster wood bodies (`BodyLayer.setRasterTextures`). */
export async function loadRenderTextures(): Promise<LoadedRenderTextures> {
  const [woodBox, ballWood] = await Promise.all([
    Assets.load<Texture>(woodBoxNineUrl),
    Assets.load<Texture>(ballWoodDiffuseUrl),
  ]);
  return { woodBox, ballWood };
}
