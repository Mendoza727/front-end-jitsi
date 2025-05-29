
'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Monitor,
  MessageSquare, Settings, MoreVertical, Users, UserPlus,
  Copy, Shield, Volume2, VolumeX
} from 'lucide-react';
import io from 'socket.io-client';

export default function Room({ roomId, owner, friendlyName }) {
  const [socket] = useState(() => io('http://localhost:4000'));
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState('');
  const [remoteTracks, setRemoteTracks] = useState([]);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [participants, setParticipants] = useState([owner]);
  const [joinRequests, setJoinRequests] = useState([]);

  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const localVideo = useRef(null);
  const conferenceRef = useRef(null);
  const connectionRef = useRef(null);
  const localTracksRef = useRef([]);
  const remoteVideosRef = useRef({}); // Para mantener referencias de videos remotos

  useEffect(() => {
    if (typeof window === 'undefined' || !window.JitsiMeetJS) {
      console.warn('JitsiMeetJS no está disponible');
      return;
    }

    const JitsiMeetJS = window.JitsiMeetJS;
    JitsiMeetJS.init();

    const connection = new JitsiMeetJS.JitsiConnection(null, null, {
      hosts: {
        domain: 'meet.jit.si',
        muc: 'conference.meet.jit.si',
        anonymousdomain: 'guest.meet.jit.si',
      },
      serviceUrl: 'wss://meet.jit.si/xmpp-websocket',
      clientNode: 'http://jitsi.org/jitsimeet',
      p2p: {
        enabled: true,
        stunServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:meet-jit-si-turnrelay.jitsi.net:443' },
        ],
      },
    });

    connectionRef.current = connection;

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
      console.log('✅ Conexión Jitsi establecida');

      const conf = connection.initJitsiConference(friendlyName, { openBridgeChannel: true });
      conferenceRef.current = conf;

      conf.on(JitsiMeetJS.events.conference.USER_JOINED, (id, user) => {
        console.log('👤 Usuario unido:', id, user);
        setRemoteParticipants(prev => {
          if (!prev.some(p => p.id === id)) {
            const newParticipant = {
              id,
              displayName: user?._displayName || `Usuario ${id.slice(0, 8)}`,
              isVideoOff: false,
              isMuted: false
            };
            console.log('👤 Participante remoto unido:', newParticipant);
            return [...prev, newParticipant];
          }
          return prev;
        });
      });

      conf.on(JitsiMeetJS.events.conference.USER_LEFT, id => {
        console.log('👋 Usuario salió:', id);
        setRemoteParticipants(prev => prev.filter(p => p.id !== id));
        setRemoteTracks(prev => prev.filter(t => t.getParticipantId() !== id));
        
        // Limpiar referencias de video
        if (remoteVideosRef.current[id]) {
          delete remoteVideosRef.current[id];
        }
      });

      conf.on(JitsiMeetJS.events.conference.TRACK_ADDED, track => {
        if (track.isLocal()) {
          console.log('🎥 Track local agregado:', track.getType());
          return;
        }

        const participantId = track.getParticipantId();
        console.log('🎥 Track remoto recibido:', track.getType(), 'de', participantId);

        setRemoteTracks(prev => {
          // Evitar duplicados
          const exists = prev.some(t => 
            t.getParticipantId() === participantId && 
            t.getType() === track.getType()
          );
          
          if (!exists) {
            console.log('📹 Agregando nuevo track remoto:', track);
            return [...prev, track];
          }
          return prev;
        });
      });

      conf.on(JitsiMeetJS.events.conference.TRACK_REMOVED, track => {
        if (track.isLocal()) return;
        
        const participantId = track.getParticipantId();
        console.log('🗑️ Track remoto removido:', track.getType(), 'de', participantId);

        setRemoteTracks(prevTracks => {
          const updatedTracks = prevTracks.filter(t => t !== track);
          
          // Si no quedan más tracks de video para este participante, limpiar la referencia
          const hasVideoTracks = updatedTracks.some(t => 
            t.getParticipantId() === participantId && t.getType() === 'video'
          );
          
          if (!hasVideoTracks && remoteVideosRef.current[participantId]) {
            try {
              track.detach();
            } catch (e) {
              console.warn('Error al desacoplar track:', e);
            }
            delete remoteVideosRef.current[participantId];
          }

          return updatedTracks;
        });
      });

      // Eventos para detectar mute/unmute
      conf.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, track => {
        if (track.isLocal()) return;
        
        const participantId = track.getParticipantId();
        const isMuted = track.isMuted();
        
        console.log(`🔇 Track ${track.getType()} ${isMuted ? 'muteado' : 'desmuteado'} para ${participantId}`);
        
        setRemoteParticipants(prev => 
          prev.map(p => {
            if (p.id === participantId) {
              if (track.getType() === 'audio') {
                return { ...p, isMuted };
              } else if (track.getType() === 'video') {
                return { ...p, isVideoOff: isMuted };
              }
            }
            return p;
          })
        );
      });

      conf.join();

      // Crear tracks locales
      JitsiMeetJS.createLocalTracks({ devices: ['audio', 'video'] })
        .then(tracks => {
          console.log('🎥 Tracks locales creados:', tracks.length);
          localTracksRef.current = tracks;

          tracks.forEach(track => {
            if (track.getType() === 'video' && localVideo.current) {
              track.attach(localVideo.current);
            }
            conf.addTrack(track);
          });
        })
        .catch(console.error);
    });

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, error => {
      console.error('🚫 Conexión Jitsi fallida:', error);
    });

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, () => {
      console.log('🔌 Conexión Jitsi desconectada');
    });

    connection.connect();

    // Socket events
    socket.emit('set-user-id', { userId: owner });
    socket.emit('join-request', { roomId: friendlyName, user: owner });

    socket.on('chat-message', msg => setChat(prev => [...prev, msg]));
    socket.on('member-joined', ({ user, members }) => setParticipants(members));
    socket.on('join-request', ({ user }) => setJoinRequests(prev => [...prev, user]));
    socket.on('join-approved', ({ members }) => setParticipants(members));
    socket.on('join-rejected', () => {
      alert('Tu solicitud para unirte a la sala fue rechazada');
      window.location.href = '/';
    });
    socket.on('join-pending', () => {
      alert('Solicitud enviada. Esperando aprobación del organizador.');
    });
    socket.on('room-not-found', () => {
      alert('Sala no encontrada');
      window.location.href = '/';
    });
    socket.on('room-deleted', () => {
      alert('La sala ha sido eliminada por el organizador');
      window.location.href = '/';
    });

    return () => {
      socket.disconnect();

      localTracksRef.current.forEach(track => {
        try {
          track.dispose();
        } catch (e) {
          console.warn('Error disposing local track:', e);
        }
      });

      if (conferenceRef.current) {
        try {
          conferenceRef.current.leave();
        } catch (e) {
          console.warn('Error leaving conference:', e);
        }
      }

      if (connectionRef.current) {
        try {
          connectionRef.current.disconnect();
        } catch (e) {
          console.warn('Error disconnecting:', e);
        }
      }
    };
  }, [friendlyName, owner, socket]);

  const sendChat = () => {
    if (!message.trim()) return;
    socket.emit('chat-message', { roomId: friendlyName, message: { from: owner, text: message } });
    setMessage('');
  };

  const toggleMute = () => {
    const audioTrack = localTracksRef.current.find(t => t.getType() === 'audio');
    if (audioTrack) {
      if (isMuted) audioTrack.unmute();
      else audioTrack.mute();
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localTracksRef.current.find(t => t.getType() === 'video');
    if (videoTrack) {
      if (isVideoOff) videoTrack.unmute();
      else videoTrack.mute();
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    const JitsiMeetJS = window.JitsiMeetJS;
    const conf = conferenceRef.current;

    const existingVideo = localTracksRef.current.find(t => t.getType() === 'video');
    if (existingVideo) {
      conf.removeTrack(existingVideo);
      existingVideo.dispose();
    }

    if (!isSharingScreen) {
      try {
        const screenTracks = await JitsiMeetJS.createLocalTracks({ devices: ['desktop'] });
        const screenTrack = screenTracks.find(t => t.getType() === 'video');

        if (screenTrack) {
          screenTrack.attach(localVideo.current);
          conf.addTrack(screenTrack);

          localTracksRef.current = localTracksRef.current.filter(t => t.getType() !== 'video');
          localTracksRef.current.push(screenTrack);

          setIsSharingScreen(true);

          screenTrack.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () => {
            setIsSharingScreen(false);
            toggleBackToCamera();
          });
        }
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    } else {
      toggleBackToCamera();
    }
  };

  const toggleBackToCamera = async () => {
    const JitsiMeetJS = window.JitsiMeetJS;
    const conf = conferenceRef.current;

    const existingVideo = localTracksRef.current.find(t => t.getType() === 'video');
    if (existingVideo) {
      conf.removeTrack(existingVideo);
      existingVideo.dispose();
    }

    try {
      const cameraTracks = await JitsiMeetJS.createLocalTracks({ devices: ['video'] });
      const cameraTrack = cameraTracks.find(t => t.getType() === 'video');

      if (cameraTrack) {
        cameraTrack.attach(localVideo.current);
        conf.addTrack(cameraTrack);

        localTracksRef.current = localTracksRef.current.filter(t => t.getType() !== 'video');
        localTracksRef.current.push(cameraTrack);

        setIsSharingScreen(false);
      }
    } catch (error) {
      console.error('Error switching back to camera:', error);
    }
  };

  const inviteParticipant = () => {
    if (!inviteEmail.trim()) return;
    socket.emit('invite', { roomId: friendlyName, invitee: inviteEmail });
    setInviteEmail('');
    setShowInviteModal(false);
    alert(`Invitación enviada a ${inviteEmail}`);
  };

  const acceptJoinRequest = (user) => {
    socket.emit('accept-join', { roomId: friendlyName, user });
    setJoinRequests(prev => prev.filter(u => u !== user));
  };

  const rejectJoinRequest = (user) => {
    socket.emit('reject-join', { roomId: friendlyName, user });
    setJoinRequests(prev => prev.filter(u => u !== user));
  };

  const deleteRoom = () => {
    if (confirm('¿Estás seguro de que quieres eliminar esta sala?')) {
      socket.emit('delete-room', { roomId: friendlyName, user: owner });
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${friendlyName}`;
    navigator.clipboard.writeText(link);
    alert('Enlace copiado al portapapeles');
  };

  const copyRoomName = () => {
    if (friendlyName) {
      navigator.clipboard.writeText(friendlyName);
      alert(`Nombre de sala copiado: ${friendlyName}`);
    } else {
      copyRoomLink();
    }
  };

  const leaveCall = () => {
    if (confirm('¿Estás seguro de que quieres salir de la llamada?')) {
      window.location.href = '/';
    }
  };

  // Obtener tracks de video remotos únicos
  const remoteVideoTracks = remoteTracks.filter(track => track.getType() === 'video');
  const totalParticipants = participants.length + remoteParticipants.length;

  console.log('🔍 Debug - Remote video tracks:', remoteVideoTracks.length);
  console.log('🔍 Debug - Remote participants:', remoteParticipants.length);

  return (
    <div className="relative h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-medium">
            {friendlyName ? `${friendlyName}` : `Sala: ${roomId}`}
          </h1>
          <span className="text-sm text-gray-400">{totalParticipants} participantes</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={copyRoomName}
            className="p-2 hover:bg-gray-700 rounded-full transition"
            title={friendlyName ? "Copiar nombre de sala" : "Copiar enlace"}
          >
            <Copy size={20} />
          </button>
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-2 hover:bg-gray-700 rounded-full transition"
            title="Participantes"
          >
            <Users size={20} />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 hover:bg-gray-700 rounded-full transition"
            title="Chat"
          >
            <MessageSquare size={20} />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="absolute inset-0 pt-16 pb-20 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-w-6xl w-full">

          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideo}
              autoPlay
              muted
              className='w-full h-full object-cover'
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-sm">
              {owner} (Tú)
            </div>
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {(owner || '?').charAt(0).toUpperCase()}
                  </div>
                  <VideoOff size={32} className="text-gray-400 mt-2" />
                </div>
              </div>
            )}
            {isMuted && (
              <div className="absolute top-2 right-2 bg-red-600 p-1 rounded-full">
                <MicOff size={16} />
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {remoteVideoTracks.map((track, i) => {
            const participantId = track.getParticipantId();
            const participant = remoteParticipants.find(p => p.id === participantId);
            const displayName = participant?.displayName || `Usuario ${participantId.slice(0, 8)}`;
            const initials = (displayName || '?').charAt(0).toUpperCase();
            const isRemoteVideoOff = participant?.isVideoOff || false;
            const isRemoteMuted = participant?.isMuted || false;

            return (
              <div key={`${participantId}-${i}`} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                {!isRemoteVideoOff && (
                  <video
                    ref={el => {
                      if (el && track) {
                        try {
                          // Desacoplar video anterior si existe
                          if (remoteVideosRef.current[participantId]) {
                            track.detach(remoteVideosRef.current[participantId]);
                          }
                          
                          // Acoplar nuevo video
                          track.attach(el);
                          remoteVideosRef.current[participantId] = el;
                          console.log('📹 Video remoto acoplado para:', participantId);
                        } catch (e) {
                          console.error('Error al acoplar video remoto:', e);
                        }
                      }
                    }}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                  />
                )}
                
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-sm">
                  {displayName}
                </div>
                
                {isRemoteVideoOff && (
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {initials}
                      </div>
                      <VideoOff size={32} className="text-gray-400 mt-2" />
                    </div>
                  </div>
                )}
                
                {isRemoteMuted && (
                  <div className="absolute top-2 right-2 bg-red-600 p-1 rounded-full">
                    <MicOff size={16} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Debug info - Remover en producción */}
          {remoteVideoTracks.length === 0 && remoteParticipants.length > 0 && (
            <div className="bg-yellow-600 p-4 rounded text-black">
              <p className="text-sm">
                🔍 Debug: {remoteParticipants.length} participantes remotos detectados, 
                pero 0 tracks de video. Revisa la consola para más detalles.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
            title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
            title={isVideoOff ? 'Activar cámara' : 'Desactivar cámara'}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition ${isSharingScreen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
            title={isSharingScreen ? 'Detener compartir pantalla' : 'Compartir pantalla'}
          >
            <Monitor size={20} />
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition"
            title="Invitar participantes"
          >
            <UserPlus size={20} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition"
            >
              <MoreVertical size={20} />
            </button>

            {showMoreOptions && (
              <div className="absolute bottom-full mb-2 right-0 bg-gray-800 rounded-lg shadow-lg py-2 min-w-48">
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center space-x-2"
                >
                  {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{isAudioMuted ? 'Activar audio' : 'Silenciar audio'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowMoreOptions(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Settings size={16} />
                  <span>Configuración</span>
                </button>
                {owner && (
                  <button
                    onClick={deleteRoom}
                    className="w-full px-4 py-2 text-left hover:bg-red-600 text-red-400 flex items-center space-x-2"
                  >
                    <Shield size={16} />
                    <span>Eliminar sala</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={leaveCall}
            className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition ml-4"
            title="Salir de la llamada"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="absolute top-16 right-0 w-80 h-full bg-gray-800 shadow-lg z-10 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-medium">Chat</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chat.map((m, i) => (
              <div key={i} className="bg-gray-700 p-3 rounded-lg">
                <span className="font-medium text-blue-400">{m.from}:</span>
                <p className="mt-1">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                className="flex-1 p-2 bg-gray-700 rounded outline-none"
                placeholder="Escribe un mensaje..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
              />
              <button
                onClick={sendChat}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Panel */}
      {showParticipants && (
        <div className="absolute top-16 right-0 w-80 h-full bg-gray-800 shadow-lg z-10 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-medium">Participantes ({totalParticipants})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {participants.map((participant, i) => (
              <div key={`socket-${i}`} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {participant.charAt(0).toUpperCase()}
                </div>
                <span>{participant}</span>
                {participant === owner && <span className="text-xs text-yellow-400">(Organizador)</span>}
              </div>
            ))}

            {remoteParticipants.map((participant, i) => (
              <div key={`jitsi-${participant.id}`} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {participant.displayName.charAt(0).toUpperCase()}
                </div>
                <span>{participant.displayName}</span>
                <span className="text-xs text-green-400">(En llamada)</span>
              </div>
            ))}
          </div>

          {joinRequests.length > 0 && (
            <div className="border-t border-gray-700 p-4">
              <h4 className="font-medium mb-2">Solicitudes de unión</h4>
              {joinRequests.map((user, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-700 rounded mb-2">
                  <span className="text-sm">{user}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => acceptJoinRequest(user)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => rejectJoinRequest(user)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-medium mb-4">Invitar participantes</h3>
            <input
              type="email"
              className="w-full p-3 bg-gray-700 rounded mb-4 outline-none"
              placeholder="Ingresa el email del participante"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={inviteParticipant}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
              >
                Enviar invitación
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}