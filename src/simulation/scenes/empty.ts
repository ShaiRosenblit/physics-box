import type { World } from "../core/World";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * The blank scene: enclosed workshop (floor, walls, ceiling).
 */
export function empty(world: World): void {
  addWorkshopEnclosure(world);
}
