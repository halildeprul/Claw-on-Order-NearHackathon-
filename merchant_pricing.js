/**
 * CLAW & ORDER - MERCHANT PRICING ENGINE & NEP-245 TOKEN CONFIG
 * Track: Games With Real Economies (NEAR Protocol)
 */

// 1. DEFINISI TOKEN MULTI-ASSET NEP-245 (LOOT DROP ROBOT)
export const NEP245_ITEMS = {
    "0": { id: "0", name: "Scrap Metal", icon: "⚙️", basePrice: 0.5, dropRate: 0.50 },
    "1": { id: "1", name: "Circuit Board", icon: "🔌", basePrice: 1.5, dropRate: 0.30 },
    "2": { id: "2", name: "Energy Cell", icon: "🔋", basePrice: 4.0, dropRate: 0.15 },
    "3": { id: "3", name: "Core Gem", icon: "💎", basePrice: 10.0, dropRate: 0.05 }
};

// 2. STATE DOMPET PENJUAL (MERCHANT AGENTS) & STOK PASAR
export const merchants = {
    blacksmith: {
        id: "blacksmith",
        name: "Scrap Blacksmith Agent",
        nearBalance: 25.0, // Dana NEAR merchant
        capacity: 100,
        inventory: { "0": 15, "1": 5, "2": 0, "3": 0 },
        demand: { "0": 80, "1": 40, "2": 10, "3": 2 },
        isOpen: true
    },
    tech_dealer: {
        id: "tech_dealer",
        name: "Cyber Tech Merchant",
        nearBalance: 50.0,
        capacity: 80,
        inventory: { "0": 2, "1": 25, "2": 12, "3": 1 },
        demand: { "0": 10, "1": 90, "2": 60, "3": 5 },
        isOpen: true
    },
    gem_trader: {
        id: "gem_trader",
        name: "Core Gem Collector",
        nearBalance: 10.0, // Rentan bangkrut
        capacity: 30,
        inventory: { "0": 0, "1": 2, "2": 5, "3": 8 },
        demand: { "0": 5, "1": 10, "2": 30, "3": 50 },
        isOpen: true
    }
};

// 3. ATURAN PENETAPAN HARGA DINAMIS & TOOLTIP REASONING
export function calculateItemPrice(merchantId, tokenId) {
    const merchant = merchants[merchantId];
    const item = NEP245_ITEMS[tokenId];

    if (!merchant || !item || !merchant.isOpen) {
        return { price: 0, reasoning: "Shop is closed or item not supported." };
    }

    const currentStock = merchant.inventory[tokenId] || 0;
    const currentDemand = merchant.demand[tokenId] || 10;
    const basePrice = item.basePrice;

    // Formula Dinamika Pasar: Jika stok tinggi & demand rendah = harga anjlok
    const supplyDemandRatio = (currentDemand - currentStock) / merchant.capacity;
    let finalPrice = basePrice * (1 + supplyDemandRatio);

    // Batas minimal harga 10% dari base price
    finalPrice = Math.max(basePrice * 0.1, Math.round(finalPrice * 100) / 100);

    // Teks alasan untuk juri (Tooltip Reasoning)
    let reasoning = "";
    if (currentStock > currentDemand * 1.5) {
        reasoning = `Market Flooded! Stock (${currentStock}) far exceeds demand (${currentDemand}). Buying price dropped by ${Math.round((1 - finalPrice/basePrice)*100)}%.`;
    } else if (currentDemand > currentStock * 2) {
        reasoning = `High Demand! Stock (${currentStock}) is low while demand (${currentDemand}) is surging. Paying ${Math.round((finalPrice/basePrice - 1)*100)}% bonus!`;
    } else {
        reasoning = `Stable Market. Stock (${currentStock}) matches demand level (${currentDemand}). Price is near base value.`;
    }

    return { price: finalPrice, reasoning: reasoning };
}

// 4. LOGIKA TRANSAKSI JUAL ITEM & KEBANGKRUTAN TOKO
export function sellItemToMerchant(playerInventory, merchantId, tokenId, amount = 1) {
    const merchant = merchants[merchantId];
    if (!merchant.isOpen) return { success: false, msg: "Merchant is bankrupt and closed!" };

    if ((playerInventory[tokenId] || 0) < amount) {
        return { success: false, msg: "Not enough items in player inventory!" };
    }

    const { price } = calculateItemPrice(merchantId, tokenId);
    const totalPayout = price * amount;

    // Cek apakah merchant punya cukup NEAR untuk membayar
    if (merchant.nearBalance < totalPayout) {
        merchant.isOpen = false; // Kebangkrutan Toko!
        return { 
            success: false, 
            msg: `BANKRUPT! ${merchant.name} ran out of NEAR tokens (${merchant.nearBalance.toFixed(2)} NEAR left) and has closed their shop!` 
        };
    }

    // Update Saldo & Stok
    merchant.nearBalance -= totalPayout;
    merchant.inventory[tokenId] = (merchant.inventory[tokenId] || 0) + amount;
    playerInventory[tokenId] -= amount;

    return {
        success: true,
        payout: totalPayout,
        remainingNear: merchant.nearBalance,
        msg: `Sold ${amount}x ${NEP245_ITEMS[tokenId].name} for ${totalPayout.toFixed(2)} NEAR!`
    };
}

// 5. FAST-FORWARD SIMULATION MODE (1 Minggu Waktu Pasar dalam 1 Menit)
let isSimulating = false;
export function runFastForwardSimulation(onTickCallback) {
    if (isSimulating) return;
    isSimulating = true;
    let ticks = 0;
    const maxTicks = 60; // 60 detik (setiap detik = 1 hari pasar)

    const interval = setInterval(() => {
        ticks++;
        
        // Simulasikan bot NPC melakukan transaksi dan mengubah stok
        Object.keys(merchants).forEach(mId => {
            const merchant = merchants[mId];
            if (!merchant.isOpen) return;

            Object.keys(NEP245_ITEMS).forEach(tId => {
                // Acak konsumsi demand & pasokan baru
                const randomDemandShift = Math.floor(Math.random() * 9) - 4;
                const randomStockConsume = Math.floor(Math.random() * 5);

                merchant.demand[tId] = Math.max(5, (merchant.demand[tId] || 10) + randomDemandShift);
                merchant.inventory[tId] = Math.max(0, (merchant.inventory[tId] || 0) - randomStockConsume);
            });

            // Fluktuasi kas NEAR merchant
            merchant.nearBalance += (Math.random() * 2 - 0.8);
            if (merchant.nearBalance <= 0) {
                merchant.nearBalance = 0;
                merchant.isOpen = false;
            }
        });

        if (onTickCallback) onTickCallback(ticks, maxTicks);

        if (ticks >= maxTicks) {
            clearInterval(interval);
            isSimulating = false;
        }
    }, 1000);
}