import { create } from 'zustand';

const useJobStore = create((set) => ({
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  status: [],
  setStatus: (status) => set({ status }),
}));

export default useJobStore;
