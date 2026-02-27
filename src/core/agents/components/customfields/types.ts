import type { CustomField } from "src/core/settings/types";

/**
 * Grid column span within Quasar's 12-column system.
 */
export type GridColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Placement of a single custom field within a group.
 */
export interface CustomFieldPlacement {
  /** The custom field's numeric id (from the backend CustomField.id) */
  fieldId: number;
  /** Column span in the 12-column grid (default: 12 = full width) */
  colSpan: GridColSpan;
  /** Sort order within the group (0-based) */
  order: number;
  /** Optional custom display name override. When set, the original field name appears as a tooltip. */
  displayName?: string;
  /** When true, text fields render as password fields with a visibility toggle. */
  maskAsPassword?: boolean;
  /** Primary color — used as the field wrapper border color (hex). */
  primaryColor?: string;
  /** Explicit background color override. Only used when bgLinkedToPrimary is false. */
  backgroundColor?: string;
  /** Explicit text color override. Only used when textLinkedToPrimary is false. */
  textColor?: string;
  /** When true (default), background is auto-derived from primaryColor. */
  bgLinkedToPrimary?: boolean;
  /** When true (default), text color is auto-computed for best contrast. */
  textLinkedToPrimary?: boolean;
  /** Saturation for auto-derived background (0-100). Defaults to 60% of primary's saturation. */
  bgSaturation?: number;
  /** Lightness for auto-derived background (0-100, default 92). */
  bgLightness?: number;
}

/**
 * A named group (section) of custom fields.
 */
export interface CustomFieldGroupConfig {
  /** Unique identifier for this group (UUID string) */
  id: string;
  /** Display name shown in the group header */
  name: string;
  /** Sort order among groups (0-based) */
  order: number;
  /** Whether the group is collapsed in view mode */
  collapsed: boolean;
  /** Fields assigned to this group, ordered */
  fields: CustomFieldPlacement[];
  /** Primary color — used as the card border color (hex, e.g. "#90caf9") */
  primaryColor?: string;
  /** Explicit background color override. Only used when bgLinkedToPrimary is false. */
  backgroundColor?: string;
  /** Explicit text color override. Only used when textLinkedToPrimary is false. */
  textColor?: string;
  /** When true (default), background is auto-derived from primaryColor. */
  bgLinkedToPrimary?: boolean;
  /** When true (default), text color is auto-computed for best contrast. */
  textLinkedToPrimary?: boolean;
  /** Saturation for auto-derived background (0-100). Defaults to 60% of primary's saturation. */
  bgSaturation?: number;
  /** Lightness for auto-derived background (0-100, default 92). */
  bgLightness?: number;
  /** @deprecated Use primaryColor instead. Kept for v1 migration. */
  borderColor?: string;
}

/**
 * The complete layout configuration stored in browser storage.
 * Version field enables future schema migrations.
 */
export interface CustomFieldLayout {
  version: 1 | 2;
  groups: CustomFieldGroupConfig[];
}

/**
 * A "resolved" field that pairs the layout placement with the
 * actual CustomField definition from the store. Used at render time.
 */
export interface ResolvedFieldItem {
  placement: CustomFieldPlacement;
  field: CustomField;
}

/** Sort criteria for fields within a group. */
export type FieldSortBy = "name-asc" | "name-desc" | "type";

/** Payload for group color changes. */
export interface GroupColorPatch {
  primaryColor?: string | undefined;
  backgroundColor?: string | undefined;
  textColor?: string | undefined;
  bgLinkedToPrimary?: boolean;
  textLinkedToPrimary?: boolean;
  bgSaturation?: number;
  bgLightness?: number;
}

/** Payload for field-level color changes. Same shape as GroupColorPatch. */
export type FieldColorPatch = GroupColorPatch;

/** Default column span for newly placed fields. */
export const DEFAULT_COL_SPAN: GridColSpan = 12;

/** The sentinel group ID for unassigned fields. Cannot be deleted. */
export const UNGROUPED_GROUP_ID = "__ungrouped__";

/** Creates a default empty layout with a single "General" group. */
export function createDefaultLayout(): CustomFieldLayout {
  return {
    version: 2,
    groups: [
      {
        id: UNGROUPED_GROUP_ID,
        name: "General",
        order: 0,
        collapsed: false,
        fields: [],
      },
    ],
  };
}
