import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useSWR from 'swr';
import api from '../services/api';
import useGroupsStore from './store/useGroupStore';
import { toast } from 'react-toastify';
import useSystemsStore from './store/useSystemsStore';
import useJobStore from './store/useJobStore';
import useWorkflowStore from './store/useWorkflowStore';

const fetcher = ([url, pageSize, offset, search_text, set, onSuccess]) => {
  const params = { params: { page_size: pageSize, page_number: offset, search_text } };
  return api.get(url, params).then(response => {
    onSuccess && onSuccess?.(response.data.data);
    set(response.data.data);
    return response.data;
  }).catch(error => {
    toast.error(error);
    return [];
  });
};

const useFilterData = (onSystemSuccess = null, onGroupSuccess = null, onWorkflowSuccess = null) => {
  const group = useGroupsStore((state) => state.group);
  const isWorkflow = useGroupsStore((state) => state.isWorkflow);
  const setIsWorkflow = useGroupsStore((state) => state.setIsWorkflow);
  const location = useLocation();
  const setGroup = useGroupsStore((state) => state.setGroup);
  const setGroups = useGroupsStore((state) => state.setGroups);
  const setSystems = useSystemsStore((state) => state.setSystems);
  const setJobs = useJobStore((state) => state.setJobs);
  const setWorkflows = useWorkflowStore((state) => state.setWorkflows);
  const [groupOffset, setGroupOffset] = useState(1);
  const [jobOffset, setJobOffset] = useState(1);
  const [workflowOffset, setWorkflowOffset] = useState(1);
  const [groupSearchTextInput, setGroupSearchTextInput] = useState('');
  const [jobSearchTextInput, setJobSearchTextInput] = useState('');
  const [workflowSearchTextInput, setWorkflowSearchTextInput] = useState(''); 

  useEffect(() => {
    setGroup(null)
  }, [location.pathname])
  
  const { data: jobData, mutate: jobFilterMutation, error: jobFilterError } = useSWR(['/job/getFilter', group, jobOffset, jobSearchTextInput, isWorkflow, setJobs], async ([url, group, jobOffset, jobSearchTextInput, isWorkflow, setJobs]) => {
    try {
      if (isWorkflow && !group) {
        return;
      }
      const input = {...(group && {group_id: group}), ...(jobSearchTextInput && {search_text: jobSearchTextInput}), page_size: 100, page_number: jobOffset}
      const response = await api.post(url, input);
      setJobs(response.data.data);
      return response.data;
    } catch (error) {
      toast.error(error);
      return [];
    }
  });
  const { data: groupData, mutate: groupFilterMutation, error: groupFilterError } = useSWR(['/group/getFilter', 100, groupOffset, groupSearchTextInput, setGroups, onGroupSuccess], fetcher);
  const { data: serverData, mutate: serverFilterMutation, error: serverFilterError } = useSWR(['/server/getFilter', null, null, null, setSystems, onSystemSuccess], fetcher);
  const { data: workflowData, mutate: workflowFilterMutation, error: workflowFilterError } = useSWR(['/workflow/getFilter', 100, workflowOffset, workflowSearchTextInput, setWorkflows, onWorkflowSuccess], fetcher);

  return {
    jobFilter: jobData?.data,
    totalJobs: jobData?.total,
    status: jobData?.status_list?.filter(i => i != null),
    jobFilterMutation,
    jobFilterError,
    groupFilter: groupData?.data,
    totalGroups: groupData?.total,
    groupFilterMutation,
    groupFilterError,
    serverFilter: serverData?.data,
    serverFilterMutation,
    serverFilterError,
    groupSearchTextInput,
    setGroupSearchTextInput,
    setGroupOffset,
    jobSearchTextInput, 
    setJobSearchTextInput,
    setJobOffset,
    jobOffset,
    setIsWorkflow,
    workflowFilter: workflowData?.data,
    totalWorkflows: workflowData?.total,
    workflowFilterMutation,
    workflowFilterError,
    workflowSearchTextInput,
    setWorkflowSearchTextInput,
    setWorkflowOffset
  };
};

export default useFilterData;
