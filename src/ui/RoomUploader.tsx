import React from 'react';
import type { MutableRefObject } from 'react';
import { loadRoomFile } from '../import/roomImport';
import type { ThreeEngine } from '../scene/engine';

interface Props {
  three: MutableRefObject<ThreeEngine | null>;
}

/**
 * Simple form for uploading a room scan (glTF/OBJ) and inserting it into the scene.
 */
const RoomUploader: React.FC<Props> = ({ three }) => {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !three.current?.group) return;
    try {
      const model = await loadRoomFile(file);
      three.current.group.add(model);
    } catch (err) {
      console.error(err);
      alert('Failed to load model');
    }
  };

  return (
    <div className="section">
      <div className="hd">
        <div>
          <div className="h1">Import room scan</div>
        </div>
      </div>
      <div className="bd">
        <input
          type="file"
          accept=".gltf,.glb,.obj"
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default RoomUploader;
