// ... (previous code remains the same until the equipped gear section)

{equippedWeapon ? (
  <div className="p-2 bg-black/20 rounded border border-amber-700">
    <p className="font-bold text-amber-200 flex items-center"><Sword className="w-4 h-4 mr-2 text-orange-400"/> {equippedWeapon.name}</p>
  </div>
) : (
  <p className="italic text-stone-400">No weapon equipped.</p>
)}

{equippedShield ? (
  <div className="p-2 bg-black/20 rounded border border-amber-700">
    <p className="font-bold text-amber-200 flex items-center"><Shield className="w-4 h-4 mr-2 text-blue-400"/> {equippedShield.name}</p>
  </div>
) : (
  <p className="italic text-stone-400">No shield equipped.</p>
)}

// ... (rest of the file remains the same)