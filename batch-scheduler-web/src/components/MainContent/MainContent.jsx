import React, { useEffect } from 'react';
import useGroupsStore from '../../hook/store/useGroupStore';
import useJobStore from '../../hook/store/useJobStore';
import useSystemsStore from '../../hook/store/useSystemsStore';
import useUserStore from '../../hook/store/useUserStore';
import useFilterData from '../../hook/useFilterData';
import useUser from '../../hook/useUser';

const MainContent = ({ children }) => {
  //Call fetch user when application is mounted
  const { users } = useUser();
  const setUsers = useUserStore((state) => state.setUsers);
  const setGroups = useGroupsStore((state) => state.setGroups);
  const setJobs = useJobStore((state) => state.setJobs);
  const setSystems = useSystemsStore((state) => state.setSystems);
  const setStatus = useJobStore((state) => state.setStatus);

  const { jobFilter, serverFilter, groupFilter, status } = useFilterData();

  useEffect(() => {
    if (groupFilter) setGroups(groupFilter);
    if (jobFilter) setJobs(jobFilter);
    if (serverFilter) setSystems(serverFilter);
    if (status) setStatus(status);
  }, [groupFilter, jobFilter, serverFilter, status, setGroups, setJobs, setSystems, setStatus]);

  useEffect(() => {
    if (users) {
      setUsers(users);
    }
  }, [users, setUsers]);

  return <main className="main-content p-4 overflow-hidden">{children}</main>;
};

export default MainContent;
