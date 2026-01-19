// @ts-nocheck
import { Box } from '@mui/material';
import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';
import { iconStatusRender } from '../../assets/IconRender';

const convertDuration = (duration) => {
    if (!duration || duration === 'None') return '';
    let result = '';
    const [hours, minutes, seconds] = duration.split(':');
    const [secs, microsecs] = seconds.split('.');

    if (hours > 0) result = result + hours + 'h ';
    if (minutes > 0) result = result + minutes + 'm ';
    result = result + secs + 's';
    return result;
};

const JobStatusIcon = ({status}) => {
    return iconStatusRender({status});
};

export default memo(({data, isConnectable}) => {
    const {jobList} = data;

    return <div className='flex flex-col gap-y-2'>{
        jobList.map((job, index) => (
            <React.Fragment key={job.job_id}>
                <Handle
                    type="target"
                    position={Position.Left}
                    onConnect={(params) => console.log('handle onConnect', params)}
                    isConnectable={isConnectable}
                />
                <Box
                    sx={{color: 'black'}}
                    className="w-full flex flex-auto items-center"
                >
                    <div>
                        {/* {job?.currentState && <JobStatusIcon status={job?.currentState} />} */}
                        <JobStatusIcon status={job?.current_state}/>
                    </div>
                    <div className="flex justify-start flex-1 pl-2 justify-items-start items-center">
                        <span className="font-semibold items-center">{job?.job_name}</span>
                    </div>
                    {/* <div className="self-end text-gray-500">
                        {convertDuration(job?.duration)}
                    </div> */}
                </Box>
                <Handle
                    type="source"
                    position={Position.Right}
                    isConnectable={isConnectable}
                />
                {index < jobList.length - 1 && <hr className="ml-1 w-full bg-gray-200"/>}
            </React.Fragment>
        ))
    }</div>
});
