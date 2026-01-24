import { create } from 'zustand';

const useSystemsStore = create((set) => ({
  systems: [],
  setSystems: (systems) => set({ systems }),
}));

export default useSystemsStore;
