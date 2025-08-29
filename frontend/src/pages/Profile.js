import React from 'react';

const Profile = ({ userData }) => {
  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-avatar">
          <img src={userData.avatar} alt={userData.fullName} />
        </div>
        <h2 className="profile-name">{userData.fullName}</h2>
        <div className="profile-username">@{userData.username}</div>
        <div className="profile-join-date">Дата регистрации: {userData.joinDate}</div>
      </div>
    </div>
  );
};

export default Profile;