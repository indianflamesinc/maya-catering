/**
 * condiment-resolver.ts  (v2)
 *
 * Resolves condiments for a dish when adding to a quote.
 * Reads default_qty and default_unit directly from menu_condiment_map.
 * No calculation logic — the default values set in menu master are used as-is.
 * Admin overrides qty/unit per quote on the quote builder page.
 */

export interface ResolvedCondiment {
  condiment_id:     string
  condiment_map_id: string   // menu_condiment_map.id — for traceability
  name:             string
  default_qty:      number   // suggested qty from menu master
  default_unit:     string   // suggested unit from menu master (e.g. "32 Oz", "Gallon")
  show_on_quote:    boolean  // from menu master — admin can toggle per quote
  is_mandatory:     boolean
  sort_order:       number
}

/**
 * Client-side resolver — use in quote builder page (client component)
 */
export async function resolveCondimentsForDish(
  supabase: any,
  menu_item_id: string,
): Promise<ResolvedCondiment[]> {
  const { data, error } = await supabase
    .from('menu_condiment_map')
    .select(`
      id,
      condiment_id,
      default_qty,
      default_unit,
      show_on_quote,
      is_mandatory,
      sort_order,
      condiments ( id, name )
    `)
    .eq('menu_item_id', menu_item_id)
    .order('sort_order')

  if (error || !data) return []

  return data.map((row: any) => ({
    condiment_id:     row.condiment_id,
    condiment_map_id: row.id,
    name:             row.condiments?.name || '',
    default_qty:      row.default_qty,
    default_unit:     row.default_unit,
    show_on_quote:    row.show_on_quote,
    is_mandatory:     row.is_mandatory,
    sort_order:       row.sort_order,
  }))
}
