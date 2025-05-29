import { VideoOff, MicOff } from 'lucide-react';

const VideoTile = ({ videoRef, name, isMuted, isVideoOff, initials, attachTrack, className }) => (
  <div className={`relative bg-gray-800 rounded-lg overflow-hidden aspect-video ${className}`}>
    <video
      ref={videoRef}
      autoPlay
      muted={!attachTrack}
      playsInline
      className="w-full h-full object-cover"
    />
    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-sm">
      {name}
    </div>

    {isVideoOff && (
      <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {initials}
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
);

export default function VideoGrid({ localVideo, owner, isVideoOff, isMuted, remoteTracks, remoteParticipants, remoteVideosRef }) {
  return (
    <div className="absolute inset-0 pt-16 pb-20 flex items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-w-6xl w-full">

        {/* Local Video */}
        <VideoTile
          videoRef={localVideo}
          name={`${owner} (Tú)`}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          initials={(owner || '?').charAt(0).toUpperCase()}
        />

        {/* Remote Videos */}
        {remoteTracks
          .filter(track => track.getType() === 'video')
          .map((track, i) => {
            const participantId = track.getParticipantId();
            const participant = remoteParticipants.find(p => p.id === participantId);
            const displayName = participant?.displayName || `Usuario ${participantId.slice(0, 8)}`;
            const initials = (displayName || '?').charAt(0).toUpperCase();
            const isRemoteVideoOff = participant?.isVideoOff;
            const isRemoteMuted = participant?.isMuted;

            return (
              <VideoTile
                key={`${participantId}-${i}`}
                videoRef={el => {
                  if (el && track) {
                    if (remoteVideosRef.current[participantId]) {
                      try {
                        track.detach(remoteVideosRef.current[participantId]);
                      } catch (e) {
                        console.log('Error detaching previous video:', e);
                      }
                    }
                    try {
                      track.attach(el);
                      remoteVideosRef.current[participantId] = el;
                    } catch (e) {
                      console.error('Error attaching video:', e);
                    }
                  }
                }}
                name={displayName}
                isMuted={isRemoteMuted}
                isVideoOff={isRemoteVideoOff}
                initials={initials}
                attachTrack
              />
            );
          })}
      </div>
    </div>
  );
}
