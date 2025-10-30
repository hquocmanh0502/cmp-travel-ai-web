// VIP Level calculation and discount logic

const VIP_TIERS = {
  bronze: {
    name: 'Bronze',
    minSpent: 0,
    discount: 0,
    color: '#CD7F32',
    icon: '🥉'
  },
  silver: {
    name: 'Silver',
    minSpent: 5000,
    discount: 5,
    color: '#C0C0C0',
    icon: '🥈'
  },
  gold: {
    name: 'Gold',
    minSpent: 15000,
    discount: 10,
    color: '#FFD700',
    icon: '🥇'
  },
  platinum: {
    name: 'Platinum',
    minSpent: 30000,
    discount: 15,
    color: '#E5E4E2',
    icon: '💎'
  },
  diamond: {
    name: 'Diamond',
    minSpent: 50000,
    discount: 20,
    color: '#B9F2FF',
    icon: '💠'
  }
};

/**
 * Calculate VIP level based on total spending
 * @param {number} totalSpent - Total amount spent by user
 * @returns {string} VIP level (bronze, silver, gold, platinum, diamond)
 */
function calculateVIPLevel(totalSpent) {
  if (totalSpent >= VIP_TIERS.diamond.minSpent) return 'diamond';
  if (totalSpent >= VIP_TIERS.platinum.minSpent) return 'platinum';
  if (totalSpent >= VIP_TIERS.gold.minSpent) return 'gold';
  if (totalSpent >= VIP_TIERS.silver.minSpent) return 'silver';
  return 'bronze';
}

/**
 * Get discount percentage for a VIP level
 * @param {string} level - VIP level
 * @returns {number} Discount percentage
 */
function getVIPDiscount(level) {
  return VIP_TIERS[level]?.discount || 0;
}

/**
 * Apply VIP discount to price
 * @param {number} price - Original price
 * @param {string} level - VIP level
 * @returns {object} {originalPrice, discount, discountAmount, finalPrice}
 */
function applyVIPDiscount(price, level) {
  const discount = getVIPDiscount(level);
  const discountAmount = Math.round(price * discount / 100);
  const finalPrice = price - discountAmount;
  
  return {
    originalPrice: price,
    discount: discount,
    discountAmount: discountAmount,
    finalPrice: finalPrice
  };
}

/**
 * Get VIP tier information
 * @param {string} level - VIP level
 * @returns {object} Tier information
 */
function getVIPTierInfo(level) {
  return VIP_TIERS[level] || VIP_TIERS.bronze;
}

/**
 * Get progress to next level
 * @param {number} totalSpent - Current total spent
 * @returns {object} {currentLevel, nextLevel, currentSpent, neededSpent, progress}
 */
function getNextLevelProgress(totalSpent) {
  const currentLevel = calculateVIPLevel(totalSpent);
  const levels = Object.keys(VIP_TIERS);
  const currentIndex = levels.indexOf(currentLevel);
  
  if (currentIndex === levels.length - 1) {
    // Already at max level
    return {
      currentLevel,
      nextLevel: null,
      currentSpent: totalSpent,
      neededSpent: 0,
      progress: 100
    };
  }
  
  const nextLevel = levels[currentIndex + 1];
  const currentTierMin = VIP_TIERS[currentLevel].minSpent;
  const nextTierMin = VIP_TIERS[nextLevel].minSpent;
  const neededSpent = nextTierMin - totalSpent;
  const progress = ((totalSpent - currentTierMin) / (nextTierMin - currentTierMin) * 100);
  
  return {
    currentLevel,
    nextLevel,
    currentSpent: totalSpent,
    neededSpent: Math.max(0, neededSpent),
    progress: Math.min(100, Math.max(0, progress))
  };
}

/**
 * Get all VIP tiers for display
 * @returns {object} All VIP tiers
 */
function getAllVIPTiers() {
  return VIP_TIERS;
}

module.exports = {
  VIP_TIERS,
  calculateVIPLevel,
  getVIPDiscount,
  applyVIPDiscount,
  getVIPTierInfo,
  getNextLevelProgress,
  getAllVIPTiers
};
