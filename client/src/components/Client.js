import React from 'react';
import Avatar from 'react-avatar';

// Simple hash function to generate consistent colors
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const getColorFromUsername = (username) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
  const hash = hashString(username);
  return colors[Math.abs(hash) % colors.length];
};

function Client({username}) {
  const color = getColorFromUsername(username);

  return (
    <div className="d-flex align-items-center mb-3">
      <Avatar name={username.toString()} size={50} round="14px" className="mr-3" color={color} />
      <span className='mx-2' style={{ color }}>{username.toString()}</span>
    </div>
  );
}

export default Client;
