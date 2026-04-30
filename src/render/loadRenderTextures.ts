import { Assets, type Texture } from "pixi.js";
import ballWoodDiffuseUrl from "./assets/ball-wood-diffuse.png";
import benchTileUrl from "./assets/bench-tile.png";
import woodBoxNineUrl from "./assets/wood-box-nineslice.png";

export interface LoadedRenderTextures {
  readonly benchTile: Texture;
  readonly woodBox: Texture;
  readonly ballWood: Texture;
}

/**
 * Loads PNG assets for the workshop bench backdrop and wood body sprites.
 * Bench tile uses repeat sampling; body textures use default clamp.
 */
export async function loadRenderTextures(): Promise<LoadedRenderTextures> {
  const [benchTile, woodBox, ballWood] = await Promise.all([
    Assets.load<Texture>(benchTileUrl),
    Assets.load<Texture>(woodBoxNineUrl),
    Assets.load<Texture>(ballWoodDiffuseUrl),
  ]);
  benchTile.source.addressMode = "repeat";
  return { benchTile, woodBox, ballWood };
}
