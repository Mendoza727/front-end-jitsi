'use client';
import { useState } from 'react';
import { Users, Plus, Link, UserPlus } from 'lucide-react';
import Room from '../components/Room';

export default function Page() {
  const [roomId, setRoomId] = useState('');
  const [friendlyName, setFriendlyName] = useState('');
  const [owner, setOwner] = useState('');
  const [joined, setJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinMode, setJoinMode] = useState('create'); // 'create', 'join-link', 'join-name'

  const createRoom = async () => {
    if (!owner.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: owner.trim() })
      });

      if (!res.ok) {
        throw new Error('Error al crear la sala');
      }

      const { roomId: id, friendlyName: name } = await res.json();
      setRoomId(id);
      setFriendlyName(name);
      setJoined(true);
    } catch (err) {
      setError('Error al crear la sala. Intenta nuevamente.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoomByLink = () => {
    if (!owner.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    if (!roomId.trim()) {
      setError('Por favor ingresa el enlace o ID de la sala');
      return;
    }

    // Extraer roomId del enlace si es una URL completa
    let extractedRoomId = roomId.trim();
    if (roomId.includes('/')) {
      const parts = roomId.split('/');
      extractedRoomId = parts[parts.length - 1];
    }

    setRoomId(extractedRoomId);
    setJoined(true);
  };

  const joinRoomByName = async () => {
    if (!owner.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    if (!friendlyName.trim()) {
      setError('Por favor ingresa el nombre de la sala');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`http://localhost:4000/find-room/${friendlyName.trim()}`);
      
      if (!res.ok) {
        throw new Error('Error al buscar la sala');
      }

      const data = await res.json();
      
      if (data.exists) {
        setRoomId(data.roomId);
        setJoined(true);
      } else {
        setError('Sala no encontrada. Verifica el nombre.');
      }
    } catch (err) {
      setError('Error al buscar la sala. Intenta nuevamente.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    alert('¡Enlace copiado al portapapeles!');
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-2xl rounded-3xl p-8 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">VideoChat</h1>
            <p className="text-gray-600">Conecta con tu equipo en videoconferencias de alta calidad</p>
          </div>

          {/* Nombre del usuario */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu nombre
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu nombre completo"
              value={owner}
              onChange={e => {
                setOwner(e.target.value);
                setError('');
              }}
            />
          </div>

          {/* Opciones de unión */}
          <div className="mb-6">
            <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
              <button
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  joinMode === 'create' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                onClick={() => setJoinMode('create')}
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Crear
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  joinMode === 'join-link' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                onClick={() => setJoinMode('join-link')}
              >
                <Link className="w-4 h-4 inline mr-1" />
                Enlace
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  joinMode === 'join-name' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                onClick={() => setJoinMode('join-name')}
              >
                <UserPlus className="w-4 h-4 inline mr-1" />
                Nombre
              </button>
            </div>

            {/* Crear nueva sala */}
            {joinMode === 'create' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  Crea una nueva sala de videoconferencia
                </p>
                <button
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={createRoom}
                  disabled={!owner.trim() || isLoading}
                >
                  {isLoading ? 'Creando sala...' : 'Crear nueva sala'}
                </button>
              </div>
            )}

            {/* Unirse por enlace */}
            {joinMode === 'join-link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enlace o ID de la sala
                  </label>
                  <input
                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://... o ID de sala"
                    value={roomId}
                    onChange={e => {
                      setRoomId(e.target.value);
                      setError('');
                    }}
                  />
                </div>
                <button
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={joinRoomByLink}
                  disabled={!owner.trim() || !roomId.trim() || isLoading}
                >
                  {isLoading ? 'Uniéndose...' : 'Unirse a la sala'}
                </button>
              </div>
            )}

            {/* Unirse por nombre */}
            {joinMode === 'join-name' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la sala
                  </label>
                  <input
                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ej: azul-leon-42"
                    value={friendlyName}
                    onChange={e => {
                      setFriendlyName(e.target.value);
                      setError('');
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pregunta al organizador por el nombre de la sala
                  </p>
                </div>
                <button
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={joinRoomByName}
                  disabled={!owner.trim() || !friendlyName.trim() || isLoading}
                >
                  {isLoading ? 'Buscando sala...' : 'Buscar y unirse'}
                </button>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-6">
            <p>Videoconferencias seguras y privadas</p>
          </div>
        </div>
      </div>
    );
  }

  return <Room roomId={roomId} owner={owner} friendlyName={friendlyName} />;
}