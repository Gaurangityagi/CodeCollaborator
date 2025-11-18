import React from 'react';
import Avatar from 'react-avatar';
import { getColorFromUsername } from '../utils';

function Client({username}) {
  const userColor = getColorFromUsername(username);

  return (
    <div className="d-flex align-items-center mb-3">
      <Avatar
        name={username.toString()}
        size={50}
        round="14px"
        className="mr-3"
        color={userColor}
      />
      <span className='mx-2' style={{ color: userColor, fontWeight: 'bold' }}>{username.toString()}</span>
    </div>
  );
}

export default Client;
