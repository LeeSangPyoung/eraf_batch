import React, { useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  useReactFlow,
  ReactFlowProvider,
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

  jobs.forEach((job) => {
    const priority = job.jobPriority || job.priority || 1;
    if (!jobGroups[priority]) {
      jobGroups[priority] = [];
    }
    jobGroups[priority].push(job);
  });

  Object.keys(jobGroups).sort((a, b) => Number(a) - Number(b)).forEach((priority, index) => {
    const jobList = jobGroups[priority];
    nodes.push({
      id: priority.toString(),
      type: 'selectorNode',
      data: { jobList },
      position: { x: index * 160, y: 0 },
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

const WorkFlowNodesInner = ({ jobs }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const initialized = useRef(false);

  useEffect(() => {
    const newNodes = mappingToCustomNode(jobs);
    setNodes(newNodes);
    const newEdges = mappingToEdges(newNodes);
    setEdges(newEdges);

    if (newNodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.3, duration: 200 });
      }, 100);
    }
  }, [jobs, setNodes, setEdges, fitView]);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges],
  );

  const onInit = useCallback(() => {
    if (!initialized.current && nodes.length > 0) {
      fitView({ padding: 0.3, duration: 200 });
      initialized.current = true;
    }
  }, [fitView, nodes.length]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onInit={onInit}
      style={{ background: '#FAFAFA', width: '100%', height: '100%' }}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Controls
        showInteractive={false}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      />
    </ReactFlow>
  );
};

const WorkFlowNodes = ({ jobs }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <WorkFlowNodesInner jobs={jobs} />
      </ReactFlowProvider>
    </div>
  );
};

export default WorkFlowNodes;
