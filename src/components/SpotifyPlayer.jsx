import { useEffect, useState } from 'react';

export default function SpotifyPlayer({ onPlayerReady, onPlaybackUpdate }) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0
  });
  const [userInfo, setUserInfo] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  // ✅ Fetch user info and detect Premium status
  useEffect(() => {
    const checkPremiumStatus = async () => {
      const token = localStorage.getItem('spotify_access_token');
      if (!token) return;

      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setUserInfo(userData);
          setIsPremium(userData.product === 'premium');
          console.log('User subscription:', userData.product);
        }
      } catch (error) {
        console.error('Error checking user info:', error);
      }
    };

    checkPremiumStatus();
  }, []);

  // ✅ Load Spotify SDK and initialize player
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const token = localStorage.getItem('spotify_access_token');

      if (!token) {
        console.error('No Spotify access token found');
        return;
      }

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Playlister Room Player',
        getOAuthToken: cb => cb(token),
        volume: 0.5
      });

      // ✅ Error handling
      spotifyPlayer.addListener('initialization_error', ({ message }) => console.error('Initialization error:', message));
      spotifyPlayer.addListener('authentication_error', ({ message }) => console.error('Authentication error:', message));
      spotifyPlayer.addListener('account_error', ({ message }) => console.error('Account error:', message));
      spotifyPlayer.addListener('playback_error', ({ message }) => console.error('Playback error:', message));

      // ✅ Playback status updates
      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        const currentState = {
          isPlaying: !state.paused,
          currentTrack: state.track_window.current_track,
          position: state.position,
          duration: state.duration
        };
        setPlayerState(currentState);
        if (onPlaybackUpdate) onPlaybackUpdate(currentState);
      });

      // ✅ Device ready
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        if (onPlayerReady) onPlayerReady(device_id);
      });

      // Device not ready
      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      spotifyPlayer.connect().then(success => {
        if (success) {
          console.log('Successfully connected to Spotify!');
          setPlayer(spotifyPlayer);
        } else {
          console.error('Failed to connect to Spotify');
        }
      });
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, []);

  // ✅ Auto-transfer playback when Premium and device ready
  useEffect(() => {
    if (deviceId && isPremium) {
      console.log('Premium detected, starting playback...');
      transferPlayback(deviceId);
      startPlayback(deviceId);
    } else if (deviceId && !isPremium) {
      console.log('Free account detected: Skipping playback control.');
    }
  }, [deviceId, isPremium]);

  // ✅ Helper: Transfer playback to Web Player
  const transferPlayback = async (deviceId) => {
    const token = localStorage.getItem('spotify_access_token');
    if (!token) return;

    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false })
      });
      console.log('Playback transferred to Web Player');
    } catch (error) {
      console.error('Error transferring playback:', error);
    }
  };

  // ✅ Helper: Start playback on Web Player
  const startPlayback = async (deviceId) => {
    const token = localStorage.getItem('spotify_access_token');
    if (!token) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: ['spotify:track:4uLU6hMCjMI75M1A2tKUQC'] // Example track
        })
      });
      console.log('Started playback on Web Player');
    } catch (error) {
      console.error('Error starting playback:', error);
    }
  };

  // ✅ Safe control functions
  const togglePlayback = async () => {
    if (!player || !isPremium || !playerState.currentTrack) {
      console.warn('Cannot toggle playback. Check Premium status or track context.');
      return;
    }
    try {
      await player.togglePlay();
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const skipToNext = async () => {
    if (!player || !isPremium || !playerState.currentTrack) return;
    try {
      await player.nextTrack();
    } catch (error) {
      console.error('Error skipping track:', error);
    }
  };

  const skipToPrevious = async () => {
    if (!player || !isPremium || !playerState.currentTrack) return;
    try {
      await player.previousTrack();
    } catch (error) {
      console.error('Error going to previous track:', error);
    }
  };

  const setVolume = async (volume) => {
    if (!player || !isPremium) return;
    try {
      await player.setVolume(volume);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ✅ UI styles
  const playerStyle = { backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #1DB954' };
  const controlsStyle = { display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px' };
  const buttonStyle = { padding: '10px 15px', backgroundColor: '#1DB954', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '14px' };

  if (!deviceId) {
    return (
      <div style={playerStyle}>
        <h3>🎵 Spotify Player</h3>
        {userInfo && (
          <p style={{ color: '#fff' }}>👤 {userInfo.display_name} ({isPremium ? 'PREMIUM' : 'FREE'})</p>
        )}
        <p style={{ color: '#fff' }}>Connecting to Spotify...</p>
      </div>
    );
  }

  return (
    <div style={playerStyle}>
      <h3 style={{ marginBottom: '10px' }}>🎵 Spotify Player</h3>
      {userInfo && (
        <div style={{ marginBottom: '15px', color: '#fff' }}>
          👤 {userInfo.display_name} ({isPremium ? 'PREMIUM' : 'FREE'})
        </div>
      )}
      {!isPremium && (
        <div style={{ backgroundColor: '#4d1e1e', padding: '10px', borderRadius: '4px', marginBottom: '15px', color: '#fff' }}>
          ⚠️ Free account detected. You can add tracks to your Spotify app, but playback control requires Premium.
        </div>
      )}
      {playerState.currentTrack ? (
        <>
          <div style={{ marginBottom: '10px', color: '#fff' }}>
            <strong>{playerState.currentTrack.name}</strong> - {playerState.currentTrack.artists.map(a => a.name).join(', ')}
          </div>
          <div style={{ width: '100%', height: '4px', background: '#333', borderRadius: '2px', marginBottom: '10px' }}>
            <div style={{
              height: '100%',
              background: '#1DB954',
              width: `${playerState.duration ? (playerState.position / playerState.duration) * 100 : 0}%`
            }}></div>
          </div>
          <div style={{ color: '#aaa', fontSize: '12px' }}>
            {formatTime(playerState.position)} / {formatTime(playerState.duration)}
          </div>
        </>
      ) : (
        <p style={{ color: '#aaa' }}>No track playing - Click "Play Now" on Spotify</p>
      )}
      <div style={controlsStyle}>
        <button onClick={skipToPrevious} style={{ ...buttonStyle, backgroundColor: isPremium ? '#1DB954' : '#666' }} disabled={!isPremium}>⏮️ Previous</button>
        <button onClick={togglePlayback} style={{ ...buttonStyle, backgroundColor: isPremium ? '#1DB954' : '#666' }} disabled={!isPremium}>
          {playerState.isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button onClick={skipToNext} style={{ ...buttonStyle, backgroundColor: isPremium ? '#1DB954' : '#666' }} disabled={!isPremium}>⏭️ Next</button>
        <div style={{ marginLeft: 'auto', color: '#fff' }}>
          🔊 <input type="range" min="0" max="1" step="0.1" defaultValue="0.5" onChange={(e) => setVolume(parseFloat(e.target.value))} disabled={!isPremium} />
        </div>
      </div>
    </div>
  );
}
