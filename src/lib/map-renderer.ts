type Coordinate = { x: number; y: number };
type Grid = ('wall' | 'open')[][];
type Edge = { p1: Coordinate; p2: Coordinate };

function normalizeEdge(p1: Coordinate, p2: Coordinate): string {
  if (p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y)) {
    return `${p1.x},${p1.y}:${p2.x},${p2.y}`;
  }
  return `${p2.x},${p2.y}:${p1.x},${p1.y}`;
}

function traceContour(grid: Grid, type: 'wall' | 'open'): string {
  const width = grid[0].length;
  const height = grid.length;
  const edges = new Map<string, Edge>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellType = grid[y][x] === 'wall' ? 'wall' : 'open';
      if (cellType === type) {
        const p = (x: number, y: number) => ({ x, y });
        // Top edge
        if (y === 0 || (grid[y - 1][x] === 'wall' ? 'wall' : 'open') !== type) {
          const key = normalizeEdge(p(x, y), p(x + 1, y));
          if (edges.has(key)) edges.delete(key); else edges.set(key, { p1: p(x, y), p2: p(x + 1, y) });
        }
        // Bottom edge
        if (y === height - 1 || (grid[y + 1][x] === 'wall' ? 'wall' : 'open') !== type) {
          const key = normalizeEdge(p(x, y + 1), p(x + 1, y + 1));
          if (edges.has(key)) edges.delete(key); else edges.set(key, { p1: p(x, y + 1), p2: p(x + 1, y + 1) });
        }
        // Left edge
        if (x === 0 || (grid[y][x - 1] === 'wall' ? 'wall' : 'open') !== type) {
          const key = normalizeEdge(p(x, y), p(x, y + 1));
          if (edges.has(key)) edges.delete(key); else edges.set(key, { p1: p(x, y), p2: p(x, y + 1) });
        }
        // Right edge
        if (x === width - 1 || (grid[y][x + 1] === 'wall' ? 'wall' : 'open') !== type) {
          const key = normalizeEdge(p(x + 1, y), p(x + 1, y + 1));
          if (edges.has(key)) edges.delete(key); else edges.set(key, { p1: p(x + 1, y), p2: p(x + 1, y + 1) });
        }
      }
    }
  }

  const pointToEdges = new Map<string, Edge[]>();
  for (const edge of edges.values()) {
    const key1 = `${edge.p1.x},${edge.p1.y}`;
    const key2 = `${edge.p2.x},${edge.p2.y}`;
    if (!pointToEdges.has(key1)) pointToEdges.set(key1, []);
    if (!pointToEdges.has(key2)) pointToEdges.set(key2, []);
    pointToEdges.get(key1)!.push(edge);
    pointToEdges.get(key2)!.push(edge);
  }

  let pathData = '';
  while (edges.size > 0) {
    const [firstKey, firstEdge] = edges.entries().next().value;
    edges.delete(firstKey);

    let currentPath = [firstEdge.p1, firstEdge.p2];
    let currentPoint = firstEdge.p2;

    while (true) {
      const key = `${currentPoint.x},${currentPoint.y}`;
      const connectedEdges = pointToEdges.get(key) || [];
      let nextEdge: Edge | null = null;

      for (const edge of connectedEdges) {
        const edgeKey = normalizeEdge(edge.p1, edge.p2);
        if (edges.has(edgeKey)) {
          nextEdge = edge;
          edges.delete(edgeKey);
          break;
        }
      }

      if (!nextEdge) break;

      currentPoint = (nextEdge.p1.x === currentPoint.x && nextEdge.p1.y === currentPoint.y) ? nextEdge.p2 : nextEdge.p1;
      currentPath.push(currentPoint);

      if (currentPoint.x === firstEdge.p1.x && currentPoint.y === firstEdge.p1.y) break;
    }
    
    const optimizedPath: Coordinate[] = [];
    if (currentPath.length > 1) {
        optimizedPath.push(currentPath[0]);
        for (let i = 1; i < currentPath.length - 1; i++) {
            const p_prev = optimizedPath[optimizedPath.length - 1];
            const p_curr = currentPath[i];
            const p_next = currentPath[i+1];
            const isCollinear = (p_curr.y - p_prev.y) * (p_next.x - p_curr.x) === (p_next.y - p_curr.y) * (p_curr.x - p_prev.x);
            if (!isCollinear) {
                optimizedPath.push(p_curr);
            }
        }
        optimizedPath.push(currentPath[currentPath.length - 1]);
    }


    if (optimizedPath.length > 0) {
      pathData += `M ${optimizedPath[0].x} ${optimizedPath[0].y} `;
      for (let i = 1; i < optimizedPath.length; i++) {
        pathData += `L ${optimizedPath[i].x} ${optimizedPath[i].y} `;
      }
    }
  }

  return pathData;
}

export function generateSvgPaths(grid: Grid): { wallPath: string; floorPath: string } {
  if (!grid || grid.length === 0) {
    return { wallPath: '', floorPath: '' };
  }
  const wallPath = traceContour(grid, 'wall');
  const floorPath = traceContour(grid, 'open');
  return { wallPath, floorPath };
}