import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';
import './xy-theme.css';
import { MarkerType } from '@xyflow/react';

const nodeTypes = {
  selectorNode: CustomNode,
};

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

  // Calculate positions with wider spacing for Apple-style nodes
  Object.keys(jobGroups).sort((a, b) => Number(a) - Number(b)).forEach((priority, index) => {
    const jobList = jobGroups[priority];
    nodes.push({
      id: priority.toString(),
      type: 'selectorNode',
      data: { jobList },
      position: { x: index * 300, y: 0 },
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
        type: MarkerType.ArrowClosed,
        color: '#D2D2D7',
        width: 16,
        height: 16,
      },
      style: { stroke: '#D2D2D7', strokeWidth: 1.5 },
      animated: true,
    });
  }
  return edges;
};

const WorkFlowNodes = ({ jobs }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const newNodes = mappingToCustomNode(jobs);
    setNodes(newNodes);
    const newEdges = mappingToEdges(newNodes);
    setEdges(newEdges);
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
      style={{ background: '#FAFAFA' }}
      nodeTypes={nodeTypes}
      snapToGrid={true}
      snapGrid={[20, 20]}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      attributionPosition="bottom-left"
    >
      <Controls />
    </ReactFlow>
  );
};

export default WorkFlowNodes;
