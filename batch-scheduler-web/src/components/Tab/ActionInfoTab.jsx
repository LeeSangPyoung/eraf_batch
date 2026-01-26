import React from 'react';
import Selected from '../CustomInput/Select';
import TextInput from '../CustomInput/TextInput';
import BaseTextArea from '../CustomInput/BaseTextArea';

const JOB_TYPE_OPTIONS = [
  { id: 'REST_API', name: 'REST_API' },
  { id: 'EXECUTABLE', name: 'EXECUTABLE' },
];

const ActionInfoTab = ({ form }) => {
  const { control, watch } = form;

  const watchJobType = watch('job_type');
  return (
    <div className="grid grid-cols-1 gap-4">
      <Selected
        control={control}
        name="job_type"
        options={JOB_TYPE_OPTIONS}
        content="Job Type"
        required
        valueKey="id"
        labelKey="name"
      />
      <BaseTextArea
        control={control}
        name="job_action"
        content="Job Action"
        required
      />

      {watchJobType === 'REST_API' && (
        <BaseTextArea
          control={control}
          name="job_body"
          content="Request Body"
        />
      )}
    </div>
  );
};

export default ActionInfoTab;
