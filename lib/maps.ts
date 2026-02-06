/**
 * Utility functions for map-related operations
 */

export interface Location {
  latitude: number
  longitude: number
  address?: string
}

/**
 * Get Arabic category name
 */
function getCategoryNameAr(category: string): string {
  const categoryMap: Record<string, string> = {
    road: 'طريق',
    electricity: 'كهرباء',
    street_light: 'إنارة',
    building: 'مبنى',
    wall: 'جدار',
    water: 'ماء',
    mine: 'لغم',
  }
  return categoryMap[category] || category
}

/**
 * Generate a Google Maps URL from a location object
 * The URL will display a pin/marker at the specified location when opened
 * @param location - Location object with latitude and longitude
 * @param mode - Optional: 'place', 'directions', or 'search' (default: 'place')
 * @returns Google Maps URL string that displays a pin at the location
 */
export function generateGoogleMapsUrl(
  location: Location,
  mode: 'place' | 'directions' | 'search' = 'place'
): string {
  const { latitude, longitude, address } = location

  switch (mode) {
    case 'directions':
      // Directions mode - user can enter their starting point
      // This will show a pin at the destination
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    
    case 'search':
      // Search mode - searches for the location and shows a pin
      const query = address || `${latitude},${longitude}`
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    
    case 'place':
    default:
      // Place mode - shows a pin at the location
      // Using ?q= format ensures a pin always appears
      if (address) {
        // Include address in query for better context, but coordinates ensure pin appears
        return `https://www.google.com/maps?q=${latitude},${longitude}+(${encodeURIComponent(address)})`
      }
      // Simple coordinate format - always shows a pin
      return `https://www.google.com/maps?q=${latitude},${longitude}`
  }
}

/**
 * Generate a ready-to-send message in Arabic from a post
 * @param post - Post object with title, content, category, and location
 * @returns Formatted Arabic message ready to send
 */
export function generateArabicMessage(post: {
  title: string
  content?: string
  category: string
  location?: Location
}): string {
  const parts: string[] = []
  
  // Type: Category (in Arabic)
  const categoryAr = getCategoryNameAr(post.category)
  // parts.push(`النوع: ${categoryAr}`)
  
  // Title (if exists)
  if (post.title) {
    // parts.push(`العنوان: ${post.title}`)
  }
  
  // Description/Content (if exists)
  if (post.content) {
    // parts.push(`الوصف: ${post.content}`)
  }
  
  // Map URL (if location exists)
  if (post.location) {
    const mapUrl = generateGoogleMapsUrl(post.location)
    parts.push(`${mapUrl}`)
  }
  
  return parts.join('\n')
}
