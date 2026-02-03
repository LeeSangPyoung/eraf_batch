import { create } from 'zustand';

const useUserStore = create((set) => ({
  users: [],
  setUsers: (payload) => set({ users: payload }),
}));

export default useUserStore;
