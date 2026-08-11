import type { z } from "zod";

import { isValidDistrictForDivision, isValidDivision, isValidUpazilaForDistrict } from "@/data/bangladesh-locations";

interface BangladeshLocationFields {
  division: string;
  district: string;
  upazila: string;
}

/**
 * Shared `superRefine` body for any Zod schema with `division`/`district`/
 * `upazila` fields — re-validates the whole combination against
 * `src/data/bangladesh-locations.ts` (the same dataset the UI's dependent
 * dropdowns read from), rejecting e.g. a Rangpur division paired with a
 * Dhaka district. Used by both checkout (`src/actions/order-schema.ts`)
 * and saved addresses (`src/actions/address-schema.ts`) — one
 * implementation, not two copies, since a client is never trusted to have
 * kept a dependent-select combination consistent either way.
 */
export function checkBangladeshLocationRelationship(data: BangladeshLocationFields, ctx: z.RefinementCtx): void {
  if (!isValidDivision(data.division)) {
    ctx.addIssue({ code: "custom", message: "Select a valid division.", path: ["division"] });
    return;
  }
  if (!isValidDistrictForDivision(data.division, data.district)) {
    ctx.addIssue({ code: "custom", message: "Select a district that belongs to the chosen division.", path: ["district"] });
    return;
  }
  if (!isValidUpazilaForDistrict(data.division, data.district, data.upazila)) {
    ctx.addIssue({ code: "custom", message: "Select an upazila/thana that belongs to the chosen district.", path: ["upazila"] });
  }
}
