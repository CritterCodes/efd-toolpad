import fs from 'fs';

const txt = fs.readFileSync('dump_viewer.txt', 'utf8');

const hookStart = txt.indexOf('const containerRef = useRef(null);');
const hookEnd = txt.lastIndexOf('}, [fileUrl, mtlUrl, gemstoneColor]);') + '}, [fileUrl, mtlUrl, gemstoneColor]);'.length;

const hookContent = txt.substring(hookStart, hookEnd);

fs.mkdirSync('src/hooks/viewers', { recursive: true });

const hookComp = `import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export function useOBJViewer({ fileUrl, mtlUrl, gemstoneColor }) {
  ${hookContent}

  return { containerRef, loading, error };
}
`;

fs.writeFileSync('src/hooks/viewers/useOBJViewer.js', hookComp);

const prefix = txt.substring(0, hookStart);
const suffix = txt.substring(hookEnd);

let newMain = prefix.replace(
  "import React, { useEffect, useRef, useState } from 'react';", 
  "import React from 'react';\nimport { useOBJViewer } from '@/hooks/viewers/useOBJViewer';"
).replace(
  "import * as THREE from 'three';", ""
).replace(
  "import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';", ""
).replace(
  "import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';", ""
);

newMain = newMain + "  const { containerRef, loading, error } = useOBJViewer({ fileUrl, mtlUrl, gemstoneColor });\n\n" + suffix;

fs.writeFileSync('src/components/viewers/OBJViewer.jsx', newMain);
console.log('OBJViewer split correctly.');
