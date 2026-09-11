import { PRODUCTS, findById } from "./products";

// حافظه موقت لیدها — فقط برای تست اولیه.
// نکته مهم: در فضای Serverless (مثل Vercel) این حافظه بین درخواست‌های مختلف
// همیشه پایدار نمی‌ماند. برای نسخه واقعی تجاری، باید این را با یک دیتابیس واقعی
// (مثل Postgres / Supabase) جایگزین کرد. فعلاً برای تست کافی است.
export const leadsStore = [];

function publicProduct(p) {
  return p;
}

export function runTool(name, input) {
  input = input || {};

  if (name === "search_products") {
    let results = PRODUCTS.filter((p) => {
      if (input.category && p.category !== input.category) return false;
      if (input.min_price && p.price < input.min_price) return false;
      if (input.max_price && p.price > input.max_price) return false;
      if (input.use_cases && input.use_cases.length) {
        const hit = input.use_cases.some((uc) => p.use_cases.includes(uc));
        if (!hit) return false;
      }
      return true;
    }).sort((a, b) => a.price - b.price);
    return {
      result: { results: results.map(publicProduct), count: results.length },
      ids: results.map((p) => p.id),
    };
  }

  if (name === "get_product") {
    const p = findById(input.id);
    if (!p) return { result: { error: "not_found" }, ids: [] };
    return { result: { product: publicProduct(p) }, ids: [p.id] };
  }

  if (name === "compare_products") {
    const ids = input.ids || [];
    const items = PRODUCTS.filter((p) => ids.includes(p.id));
    const matrix = { cpu: {}, gpu: {}, ram: {}, price: {} };
    items.forEach((p) => {
      matrix.cpu[p.id] = p.specifications.cpu;
      matrix.gpu[p.id] = p.specifications.gpu;
      matrix.ram[p.id] = p.specifications.ram;
      matrix.price[p.id] = p.price;
    });
    return {
      result: { products: items.map(publicProduct), comparison_matrix: matrix },
      ids: items.map((p) => p.id),
    };
  }

  if (name === "check_inventory") {
    const p = findById(input.id);
    if (!p) return { result: { error: "not_found" }, ids: [] };
    return { result: { id: p.id, in_stock: p.stock > 0, quantity: p.stock }, ids: [p.id] };
  }

  if (name === "create_lead") {
    const lead = {
      id: "lead-" + Date.now(),
      name: input.name || "—",
      phone: input.phone,
      interested_products: input.interested_products || [],
      notes: input.notes || "",
      created_at: new Date().toISOString(),
    };
    leadsStore.push(lead);
    return { result: { lead_id: lead.id, status: "created" }, ids: [] };
  }

  if (name === "add_to_cart") {
    const p = findById(input.product_id);
    if (!p) return { result: { error: "not_found" }, ids: [] };
    return {
      result: { added: true, product_id: p.id, quantity: input.quantity || 1 },
      ids: [p.id],
    };
  }

  return { result: { error: "unknown_tool" }, ids: [] };
}
