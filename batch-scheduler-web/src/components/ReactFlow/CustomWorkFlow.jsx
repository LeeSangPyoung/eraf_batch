import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Controls,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';
import './xy-theme.css';
import { MarkerType } from '@xyflow/react';
import { AnimatedSVGEdge } from './AnimatedSVGEdge';

const initBgColor = '#f6f8fa';
const nodeTypes = {
  selectorNode: CustomNode,
};
const edgeTypes = {
  animatedSvg: AnimatedSVGEdge,
};

const defaultViewport = { x: 20, y: 220, zoom: 1.25};
const mappingToCustomNode = (jobs) => {
  const nodes = [];
  const jobGroups = {};

  // Group jobs by jobPriority
  jobs.forEach((job) => {
    if (!jobGroups[job.jobPriority]) {
      jobGroups[job.jobPriority] = [];
    }
    jobGroups[job.jobPriority].push(job);
  });

  // Calculate positions
  Object.keys(jobGroups).forEach((priority, index) => {
    const jobList = jobGroups[priority];
    nodes.push({
      id: priority.toString(),
      type: 'selectorNode',
      data: {jobList},
      position: { x: index * 250, y: 0 },
      sourcePosition: 'right',
    });
  });
  return nodes;
};

const mappingToEdges = (listNodes) => {
  let edges = [];
  if (listNodes.length === 0) return [];

  for (let i = 0; i < listNodes.length - 1; i++) {
    edges.push({
      id: `e${listNodes[i].id}->${listNodes[i + 1].id}`,
      source: listNodes[i].id,
      target: listNodes[i + 1].id,
      markerEnd: {
        type: MarkerType.Arrow,
      },
      animated: true,
    });
  }
  return edges;
};

const WorkFlowNodes = ({ jobs }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [bgColor, setBgColor] = useState(initBgColor);

  const onChange = (event) => {
    setNodes((nds) =>
      nds.map((node) => {
        const color = event.target.value;

        setBgColor(color);

        return {
          ...node,
          data: {
            ...node.data,
            color,
          },
        };
      }),
    );
  };

  useEffect(() => {
    const newNodes = mappingToCustomNode(jobs)
    setNodes(newNodes);
    const edges = mappingToEdges(newNodes);
    setEdges(edges);
  }, [jobs]);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [jobs],
  );
  return (
    <ReactFlow
      className="min-h-[500px]"
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      style={{ background: bgColor }}
      nodeTypes={nodeTypes}
      snapToGrid={true}
      snapGrid={[20, 20]}
      defaultViewport={defaultViewport}
      attributionPosition="bottom-left"
    >
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
};

export default WorkFlowNodes;
