/**
 * Format metal type and karat into a readable label
 */
export function formatMetalLabel(metalType, karat) {
  const metalNames = {
    'sterling_silver': 'Sterling Silver',
    'yellow_gold': 'Yellow Gold',
    'white_gold': 'White Gold', 
    'rose_gold': 'Rose Gold',
    'platinum': 'Platinum'
  };
  
  const metalName = metalNames[metalType] || metalType.replace(/_/g, ' ');
  return karat && karat !== 'standard' ? `${metalName} ${karat}` : metalName;
}