import { create } from 'zustand';

const useGroupsStore = create((set) => ({
  groups: [],
  group: null,
  setGroups: (groups) => set({ groups }),
  setGroup: (group) => set({ group }),
}));

export default useGroupsStore;
