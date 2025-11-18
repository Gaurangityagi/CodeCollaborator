// Simple hash function to generate consistent colors
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

export const getColorFromUsername = (username) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2', '#A3E4D7', '#FAD7A0', '#C39BD3', '#A9DFBF', '#F4D03F',
    '#58D68D', '#5DADE2', '#AF7AC5', '#F8C471', '#85C1E9', '#82E0AA', '#EC7063', '#AED6F1', '#D7BDE2', '#A9DFBF'
  ];
  // Ensure username is a string and not null/undefined
  const safeUsername = String(username || 'anonymous');
  const hash = hashString(safeUsername);
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};
