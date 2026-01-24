import { create } from 'zustand';

const useGroupsStore = create((set) => ({
  groups: [],
  group: null,
  isWorkflow: false,
  setGroups: (groups) => set({ groups }),
  setGroup: (group) => set({ group }),
  setIsWorkflow: (isWorkflow) => set({ isWorkflow }),
}));

export default useGroupsStore;
