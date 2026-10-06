// Our product's brand, fixed in every store's panel. The store's own name and logo come from Apariencia.
// Colors from the Coral theme (#9a3412 / #fb7185), on white so they read over any panel color.
const PanelBrand = () => (
  <span className="inline-flex items-baseline gap-1 rounded-lg bg-white px-2.5 py-1 shadow-sm">
    <span className="text-lg font-black tracking-tight leading-none text-[#9a3412]">Ecom</span>
    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#fb7185]">by Yeison</span>
  </span>
);

export default PanelBrand;
