import { useCallback, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const useFilterAndPagination = ({jobId, groupId, search} = {jobId: '', groupId: '', search: ''}) => {
  const location = useLocation();
  const jobNavigate = jobId || location.state?.job;
  const [job, setJob] = useState(jobNavigate ? jobNavigate : 'all');
  const [server, setServer] = useState('all');
  const [group, setGroup] = useState(groupId || 'all');

  // Update job when jobId prop changes
  useEffect(() => {
    if (jobId) {
      setJob(jobId);
    }
  }, [jobId]);
  const [workflow, setWorkflow] = useState('all');
  const [searchTerm, setSearchTerm] = useState(search);
  const [pageSize, setPageSize] = useState(30);
  const [pageNumber, setPageNumber] = useState(1);

  const handleChangePage = (event, newPage) => {
    setPageNumber(newPage + 1);
  };

  const goToPage = (newPage) => {
    setPageNumber(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setPageSize(parseInt(event.target.value, 10));
    setPageNumber(1);
  };

  const handleChange = useCallback((e, key) => {
    switch (key) {
      case 'job':
        setJob(e.target.value);
        break;
      case 'server':
        setServer(e.target.value);
        break;
      case 'group':
        setGroup(e.target.value);
        break;
      case 'workflow':
        setWorkflow(e.target.value);
        break;
      default:
        break;
    }
  }, []);

  return {
    job,
    server,
    group,
    workflow,
    handleChange,
    searchTerm,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    goToPage,
  };
};

export default useFilterAndPagination;
