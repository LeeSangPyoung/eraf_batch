import { create } from 'zustand';

const useWorkflowStore = create((set) => ({
  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),
}));

export default useWorkflowStore;
