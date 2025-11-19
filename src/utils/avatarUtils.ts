/**
 * Generates consistent avatar initials from a display name
 * Returns first 2 letters (uppercase) from the name
 */
export function getAvatarInitials(displayName: string): string {
  if (!displayName || displayName.trim() === '') {
    return 'U';
  }

  const trimmedName = displayName.trim();
  const words = trimmedName.split(/\s+/).filter(word => word.length > 0);

  if (words.length === 0) {
    return trimmedName.slice(0, 2).toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  // Take first letter of first two words
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generates a consistent background color based on display name
 * Uses a hash function to ensure the same name always gets the same color
 */
export function getAvatarColor(displayName: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-amber-500',
  ];

  // Simple hash function for consistent color assignment
  let hash = 0;
  const name = displayName.toLowerCase().trim();
  
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
